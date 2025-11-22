from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from sqlalchemy import func
import os
import calendar

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///budget_v2.db')

# Fix for PostgreSQL URL from Render
if app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgres://'):
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ==================== MODELS ====================

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    budgets = db.relationship('Budget', backref='user', lazy=True, cascade='all, delete-orphan')

class Budget(db.Model):
    __tablename__ = 'budgets'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    month = db.Column(db.String(7), nullable=False)  # Format: YYYY-MM
    income = db.Column(db.Float, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    transactions = db.relationship('Transaction', backref='budget', lazy=True, cascade='all, delete-orphan')
    
    __table_args__ = (db.UniqueConstraint('user_id', 'month', name='unique_user_month'),)

class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.Integer, primary_key=True)
    budget_id = db.Column(db.Integer, db.ForeignKey('budgets.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(200), default='')
    date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Default categories with icons
DEFAULT_CATEGORIES = [
    {'name': 'Groceries', 'icon': '🍔', 'color': '#FF6384'},
    {'name': 'Transport', 'icon': '🚗', 'color': '#36A2EB'},
    {'name': 'Dining Out', 'icon': '🍕', 'color': '#FFCE56'},
    {'name': 'Entertainment', 'icon': '🎬', 'color': '#4BC0C0'},
    {'name': 'Shopping', 'icon': '👕', 'color': '#9966FF'},
    {'name': 'Bills', 'icon': '💳', 'color': '#FF9F40'},
    {'name': 'Healthcare', 'icon': '⚕️', 'color': '#FF6384'},
    {'name': 'Housing', 'icon': '🏠', 'color': '#C9CBCF'},
    {'name': 'Travel', 'icon': '✈️', 'color': '#4BC0C0'},
    {'name': 'Other', 'icon': '📝', 'color': '#36A2EB'}
]

# ==================== HELPER FUNCTIONS ====================

def get_category_info(category_name):
    """Get icon and color for a category"""
    cat = next((c for c in DEFAULT_CATEGORIES if c['name'] == category_name), None)
    if cat:
        return cat['icon'], cat['color']
    return '📝', '#36A2EB'

def get_week_dates(date_obj):
    """Get start and end date of the week containing date_obj (Monday-Sunday)"""
    start = date_obj - timedelta(days=date_obj.weekday())
    end = start + timedelta(days=6)
    return start, end

# ==================== AUTH ROUTES ====================

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', username=session.get('username'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Username and password required'}), 400
        
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password, password):
            session['user_id'] = user.id
            session['username'] = user.username
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'message': 'Invalid username or password'}), 401
    
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Username and password required'}), 400
        
        if len(password) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
        
        if User.query.filter_by(username=username).first():
            return jsonify({'success': False, 'message': 'Username already exists'}), 400
        
        hashed_password = generate_password_hash(password)
        new_user = User(username=username, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        
        session['user_id'] = new_user.id
        session['username'] = new_user.username
        return jsonify({'success': True})
    
    return render_template('signup.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# ==================== API ROUTES ====================

@app.route('/api/categories')
def get_categories():
    """Get all available categories"""
    return jsonify(DEFAULT_CATEGORIES)

@app.route('/api/budget/<month>')
def get_budget(month):
    """Get budget overview for a month"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user_id']
    budget = Budget.query.filter_by(user_id=user_id, month=month).first()
    
    if not budget:
        return jsonify({
            'income': 0,
            'spent': 0,
            'remaining': 0,
            'last_updated': None,
            'top_categories': []
        })
    
    # Calculate totals by category
    category_totals = db.session.query(
        Transaction.category,
        func.sum(Transaction.amount).label('total'),
        func.count(Transaction.id).label('count')
    ).filter(
        Transaction.budget_id == budget.id
    ).group_by(
        Transaction.category
    ).all()
    
    total_spent = sum(cat.total for cat in category_totals)
    
    # Format categories with icons and colors
    categories = []
    for cat in category_totals:
        icon, color = get_category_info(cat.category)
        categories.append({
            'name': cat.category,
            'icon': icon,
            'color': color,
            'total': float(cat.total),
            'count': cat.count,
            'percentage': round((cat.total / total_spent * 100) if total_spent > 0 else 0, 1)
        })
    
    # Sort by total (descending) and get top 3
    categories.sort(key=lambda x: x['total'], reverse=True)
    top_categories = categories[:3]
    
    return jsonify({
        'income': float(budget.income),
        'spent': float(total_spent),
        'remaining': float(budget.income - total_spent),
        'percentage': round((total_spent / budget.income * 100) if budget.income > 0 else 0, 1),
        'last_updated': budget.last_updated.strftime('%b %d, %Y at %I:%M %p') if budget.last_updated else None,
        'top_categories': top_categories,
        'all_categories': categories
    })

@app.route('/api/budget/<month>/income', methods=['POST'])
def update_income(month):
    """Update monthly income"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user_id']
    data = request.get_json()
    income = float(data.get('income', 0))
    
    if income < 0:
        return jsonify({'error': 'Income cannot be negative'}), 400
    
    budget = Budget.query.filter_by(user_id=user_id, month=month).first()
    
    if not budget:
        budget = Budget(user_id=user_id, month=month, income=income)
        db.session.add(budget)
    else:
        budget.income = income
        budget.last_updated = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({'success': True, 'income': float(budget.income)})

@app.route('/api/transactions/<month>')
def get_transactions(month):
    """Get all transactions for a month, grouped by day"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user_id']
    budget = Budget.query.filter_by(user_id=user_id, month=month).first()
    
    if not budget:
        return jsonify({'transactions': [], 'daily_totals': {}})
    
    # Get all transactions sorted by date (newest first)
    transactions = Transaction.query.filter_by(budget_id=budget.id).order_by(Transaction.date.desc(), Transaction.created_at.desc()).all()
    
    # Group by date
    grouped = {}
    daily_totals = {}
    
    for trans in transactions:
        date_key = trans.date.isoformat()
        
        if date_key not in grouped:
            grouped[date_key] = []
            daily_totals[date_key] = 0
        
        icon, color = get_category_info(trans.category)
        
        grouped[date_key].append({
            'id': trans.id,
            'amount': float(trans.amount),
            'category': trans.category,
            'icon': icon,
            'color': color,
            'description': trans.description,
            'date': date_key,
            'time': trans.created_at.strftime('%I:%M %p')
        })
        
        daily_totals[date_key] += trans.amount
    
    return jsonify({
        'transactions': grouped,
        'daily_totals': {k: float(v) for k, v in daily_totals.items()}
    })

@app.route('/api/transactions/<month>/week')
def get_week_totals(month):
    """Get daily totals for the current week"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user_id']
    budget = Budget.query.filter_by(user_id=user_id, month=month).first()
    
    if not budget:
        return jsonify({'week': []})
    
    # Get current week dates
    today = datetime.now().date()
    week_start, week_end = get_week_dates(today)
    
    # Generate all days in the week
    week_days = []
    current = week_start
    while current <= week_end:
        week_days.append(current)
        current += timedelta(days=1)
    
    # Get transactions for this week
    week_transactions = db.session.query(
        Transaction.date,
        func.sum(Transaction.amount).label('total')
    ).filter(
        Transaction.budget_id == budget.id,
        Transaction.date >= week_start,
        Transaction.date <= week_end
    ).group_by(
        Transaction.date
    ).all()
    
    # Create lookup dict
    totals_dict = {t.date: float(t.total) for t in week_transactions}
    
    # Build response
    week_data = []
    for day in week_days:
        week_data.append({
            'date': day.isoformat(),
            'day': day.strftime('%a'),
            'day_num': day.day,
            'total': totals_dict.get(day, 0),
            'is_today': day == today
        })
    
    return jsonify({'week': week_data})

@app.route('/api/transaction', methods=['POST'])
def add_transaction():
    """Add a new transaction"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user_id']
    data = request.get_json()
    
    amount = float(data.get('amount', 0))
    category = data.get('category', '').strip()
    description = data.get('description', '').strip()
    date_str = data.get('date', datetime.now().date().isoformat())
    month = date_str[:7]  # YYYY-MM
    
    if amount <= 0:
        return jsonify({'error': 'Amount must be positive'}), 400
    
    if not category:
        return jsonify({'error': 'Category is required'}), 400
    
    # Get or create budget for this month
    budget = Budget.query.filter_by(user_id=user_id, month=month).first()
    if not budget:
        budget = Budget(user_id=user_id, month=month, income=0)
        db.session.add(budget)
        db.session.flush()
    
    # Create transaction
    transaction = Transaction(
        budget_id=budget.id,
        amount=amount,
        category=category,
        description=description,
        date=datetime.fromisoformat(date_str).date()
    )
    
    db.session.add(transaction)
    budget.last_updated = datetime.utcnow()
    db.session.commit()
    
    icon, color = get_category_info(category)
    
    return jsonify({
        'success': True,
        'transaction': {
            'id': transaction.id,
            'amount': float(transaction.amount),
            'category': transaction.category,
            'icon': icon,
            'color': color,
            'description': transaction.description,
            'date': transaction.date.isoformat()
        }
    })

@app.route('/api/transaction/<int:trans_id>', methods=['DELETE'])
def delete_transaction(trans_id):
    """Delete a transaction"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user_id']
    
    # Get transaction and verify ownership
    transaction = Transaction.query.join(Budget).filter(
        Transaction.id == trans_id,
        Budget.user_id == user_id
    ).first()
    
    if not transaction:
        return jsonify({'error': 'Transaction not found'}), 404
    
    budget = transaction.budget
    db.session.delete(transaction)
    budget.last_updated = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/trends/<int:months>')
def get_trends(months):
    """Get spending trends for the last N months"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user_id']
    
    # Get last N months
    today = datetime.now()
    month_list = []
    for i in range(months - 1, -1, -1):
        date = today - timedelta(days=30 * i)
        month_list.append(date.strftime('%Y-%m'))
    
    # Get budgets for these months
    budgets = Budget.query.filter(
        Budget.user_id == user_id,
        Budget.month.in_(month_list)
    ).all()
    
    # Calculate data for each month
    trends = []
    for month_str in month_list:
        budget = next((b for b in budgets if b.month == month_str), None)
        
        if budget:
            total_spent = sum(t.amount for t in budget.transactions)
            savings = budget.income - total_spent
        else:
            total_spent = 0
            savings = 0
        
        month_date = datetime.strptime(month_str, '%Y-%m')
        trends.append({
            'month': month_str,
            'label': month_date.strftime('%b %Y'),
            'income': float(budget.income) if budget else 0,
            'spent': float(total_spent),
            'savings': float(savings)
        })
    
    return jsonify({'trends': trends})

# Initialize database
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)

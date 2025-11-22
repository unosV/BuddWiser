# 💰 Modern Budget Tracker v2

A beautiful, modern budget tracking application with transaction-based tracking, charts, trends, and analytics.

## ✨ Features

### Core Features
- ✅ **Transaction-Based Tracking** - Track individual expenses, not just totals
- ✅ **Monthly Overview** - Income, spent, remaining with progress bar
- ✅ **Week Calendar** - Visual representation of daily spending
- ✅ **Category Management** - 10 pre-defined categories with icons
- ✅ **Beautiful Charts** - Pie chart, bar chart, and trend lines
- ✅ **3-Month Trends** - See your spending patterns over time
- ✅ **Multi-User** - Secure login/signup system
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile

### Modern UI
- 🎨 Beautiful gradient design
- 🌈 Smooth animations and transitions
- 📱 Mobile-first responsive layout
- ⚡ Fast and intuitive
- 🎯 Single-view interface (no confusing tabs)

### Tech Stack
- **Backend**: Flask + SQLAlchemy
- **Frontend**: Vanilla JavaScript + Chart.js
- **Database**: SQLite (dev) / PostgreSQL (production)
- **Styling**: Modern CSS with CSS variables

## 🚀 Quick Start

### Local Development

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Run the app:**
```bash
python app.py
```

3. **Open browser:**
```
http://localhost:5000
```

### Deploy to Render

1. **Create GitHub repo:**
   - Create new repo: `budget-tracker-v2`
   - Upload all files from this folder

2. **Create Render Web Service:**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Settings:
     - **Name**: budget-tracker-v2
     - **Environment**: Python 3
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn app:app`
   - Click "Create Web Service"

3. **Add Database (Optional but recommended):**
   - Click "New +" → "PostgreSQL"
   - Name it: `budget-tracker-v2-db`
   - Copy the "Internal Database URL"
   - In your web service, add environment variable:
     - Key: `DATABASE_URL`
     - Value: (paste the database URL)

4. **Wait for deployment** (~2-3 minutes)

5. **Your app is live!** 🎉

## 📁 File Structure

```
budget-tracker-v2/
├── app.py                 # Flask backend
├── requirements.txt       # Python dependencies
├── templates/
│   ├── index.html        # Main app interface
│   ├── login.html        # Login page
│   └── signup.html       # Signup page
└── static/
    ├── js/
    │   └── main.js       # Frontend logic + Chart.js
    └── css/
        └── styles.css    # Modern styling
```

## 🎯 How to Use

### First Time Setup
1. **Sign up** for a new account
2. **Set monthly income** (click "Edit Income")
3. **Add your first expense** (click the + button)

### Daily Use
1. Click **+** button (bottom right)
2. Enter amount, select category, add description
3. Choose date and click "Add Expense"
4. View your spending in real-time!

### Features to Explore
- **Week Calendar** - See daily spending at a glance
- **Top Spending** - Your biggest expense categories
- **View All Categories** - Detailed breakdown
- **Charts** - Visual representations
- **Trends** - 3-month comparison

## 🎨 Customization

### Adding New Categories
Edit `DEFAULT_CATEGORIES` in `app.py`:
```python
DEFAULT_CATEGORIES = [
    {'name': 'Your Category', 'icon': '🎯', 'color': '#FF6384'},
    # Add more...
]
```

### Changing Colors
Edit CSS variables in `styles.css`:
```css
:root {
    --primary: #667eea;  /* Change this */
    --success: #38ef7d;  /* And this */
    /* etc... */
}
```

## 🔒 Security Features

- ✅ Password hashing with Werkzeug
- ✅ Session-based authentication
- ✅ SQL injection protection (SQLAlchemy)
- ✅ CSRF protection ready
- ✅ Secure password requirements (min 6 characters)

## 📱 Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## 🆘 Troubleshooting

### Database errors on Render
- Make sure you've added the `DATABASE_URL` environment variable
- Check that the database URL starts with `postgresql://` not `postgres://`

### Charts not showing
- Make sure Chart.js CDN is accessible
- Check browser console for errors
- Try hard refresh (Ctrl+Shift+R)

### Styles not loading
- Check that static files are being served correctly
- Verify file paths in templates

## 🎯 Future Enhancements

Potential features to add:
- [ ] Budget limits per category
- [ ] Recurring expenses
- [ ] Export to CSV/PDF
- [ ] Receipt scanning
- [ ] Multiple currencies
- [ ] Shared budgets
- [ ] Mobile app

## 📄 License

Free to use and modify!

## 🙏 Credits

Built with ❤️ using:
- Flask
- Chart.js
- Modern CSS

---

**Enjoy your new budget tracker!** 💰✨

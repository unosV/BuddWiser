// ==================== GLOBAL STATE ====================

let currentMonth = new Date().toISOString().slice(0, 7);
let budgetData = {
    income: 0,
    spent: 0,
    remaining: 0,
    percentage: 0,
    top_categories: [],
    all_categories: []
};
let allCategories = [];
let transactions = {};
let dailyTotals = {};

// Chart instances
let categoryChart = null;
let budgetChart = null;
let trendChart = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function() {
    // Set current month
    document.getElementById('monthInput').value = currentMonth;
    
    // Load categories
    await loadCategories();
    
    // Load budget data
    await loadBudgetData();
    
    // Load transactions
    await loadTransactions();
    
    // Load week calendar
    await loadWeekCalendar();
    
    // Load trends
    await loadTrends();
    
    // Event listeners
    document.getElementById('monthInput').addEventListener('change', function(e) {
        currentMonth = e.target.value;
        refreshAll();
    });
    
    // Set default date to today
    document.getElementById('dateInput').value = new Date().toISOString().slice(0, 10);
});

// ==================== API CALLS ====================

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        allCategories = await response.json();
        
        // Populate category select
        const select = document.getElementById('categoryInput');
        select.innerHTML = '';
        allCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = `${cat.icon} ${cat.name}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadBudgetData() {
    try {
        const response = await fetch(`/api/budget/${currentMonth}`);
        budgetData = await response.json();
        
        updateOverviewCard();
        updateCharts();
    } catch (error) {
        console.error('Error loading budget:', error);
        showToast('Error loading budget data', 'error');
    }
}

async function loadTransactions() {
    try {
        const response = await fetch(`/api/transactions/${currentMonth}`);
        const data = await response.json();
        
        transactions = data.transactions || {};
        dailyTotals = data.daily_totals || {};
        
        renderTransactions();
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

async function loadWeekCalendar() {
    try {
        const response = await fetch(`/api/transactions/${currentMonth}/week`);
        const data = await response.json();
        
        renderWeekCalendar(data.week || []);
    } catch (error) {
        console.error('Error loading week:', error);
    }
}

async function loadTrends() {
    try {
        const response = await fetch('/api/trends/3');
        const data = await response.json();
        
        renderTrendChart(data.trends || []);
    } catch (error) {
        console.error('Error loading trends:', error);
    }
}

// ==================== UI UPDATES ====================

function updateOverviewCard() {
    // Update header
    const monthDate = new Date(currentMonth + '-01');
    document.querySelector('.overview-header h2').textContent = 
        monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Update stats
    document.getElementById('incomeValue').textContent = `$${budgetData.income.toFixed(2)}`;
    document.getElementById('spentValue').textContent = `$${budgetData.spent.toFixed(2)}`;
    document.getElementById('remainingValue').textContent = `$${budgetData.remaining.toFixed(2)}`;
    
    // Update progress
    const progressFill = document.getElementById('progressFill');
    const progressLabel = document.getElementById('progressLabel');
    progressFill.style.width = `${budgetData.percentage}%`;
    progressLabel.textContent = `${budgetData.percentage}% spent`;
    
    // Update color based on percentage
    if (budgetData.percentage > 90) {
        progressFill.style.background = 'var(--danger-gradient)';
    } else if (budgetData.percentage > 75) {
        progressFill.style.background = 'var(--warning-gradient)';
    } else {
        progressFill.style.background = 'var(--primary-gradient)';
    }
    
    // Update top categories
    const topCategoryList = document.getElementById('topCategoryList');
    const viewAllBtn = document.getElementById('viewAllBtn');
    
    if (budgetData.top_categories.length === 0) {
        topCategoryList.innerHTML = '<p class="empty-state">No expenses yet</p>';
        viewAllBtn.style.display = 'none';
    } else {
        topCategoryList.innerHTML = '';
        budgetData.top_categories.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.innerHTML = `
                <div class="category-info">
                    <span class="category-icon">${cat.icon}</span>
                    <span class="category-name">${cat.name}</span>
                </div>
                <div class="category-amount">
                    <span class="category-value">$${cat.total.toFixed(2)}</span>
                    <span class="category-percent">${cat.percentage}%</span>
                </div>
            `;
            topCategoryList.appendChild(item);
        });
        
        if (budgetData.all_categories.length > 3) {
            viewAllBtn.style.display = 'block';
        } else {
            viewAllBtn.style.display = 'none';
        }
    }
    
    // Update last updated
    if (budgetData.last_updated) {
        document.getElementById('lastUpdated').textContent = `Last updated: ${budgetData.last_updated}`;
    } else {
        document.getElementById('lastUpdated').textContent = 'No transactions yet';
    }
}

function renderWeekCalendar(weekData) {
    const calendar = document.getElementById('weekCalendar');
    calendar.innerHTML = '';
    
    weekData.forEach(day => {
        const cell = document.createElement('div');
        cell.className = `day-cell ${day.is_today ? 'today' : ''}`;
        cell.innerHTML = `
            <div class="day-name">${day.day}</div>
            <div class="day-number">${day.day_num}</div>
            <div class="day-total">$${day.total.toFixed(0)}</div>
        `;
        calendar.appendChild(cell);
    });
}

function renderTransactions() {
    const listContainer = document.getElementById('transactionsList');
    
    if (Object.keys(transactions).length === 0) {
        listContainer.innerHTML = '<p class="empty-state">No transactions yet. Add your first expense!</p>';
        return;
    }
    
    listContainer.innerHTML = '';
    
    // Get sorted dates (newest first)
    const dates = Object.keys(transactions).sort().reverse();
    
    dates.forEach(date => {
        const dayTransactions = transactions[date];
        const dayTotal = dailyTotals[date];
        
        // Create day section
        const daySection = document.createElement('div');
        daySection.className = 'transaction-day';
        
        // Day header
        const header = document.createElement('div');
        header.className = 'transaction-day-header';
        
        const dateObj = new Date(date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
        });
        
        header.innerHTML = `
            <span>${formattedDate}</span>
            <span>$${dayTotal.toFixed(2)}</span>
        `;
        daySection.appendChild(header);
        
        // Transactions
        dayTransactions.forEach(trans => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = `
                <div class="transaction-info">
                    <span class="transaction-icon">${trans.icon}</span>
                    <div class="transaction-details">
                        <div class="transaction-category">${trans.category}</div>
                        ${trans.description ? `<div class="transaction-description">${trans.description}</div>` : ''}
                    </div>
                </div>
                <div class="transaction-right">
                    <span class="transaction-amount">$${trans.amount.toFixed(2)}</span>
                    <button class="delete-transaction-btn" onclick="deleteTransaction(${trans.id})" title="Delete">
                        🗑️
                    </button>
                </div>
            `;
            daySection.appendChild(item);
        });
        
        listContainer.appendChild(daySection);
    });
}

// ==================== CHARTS ====================

function updateCharts() {
    updateCategoryChart();
    updateBudgetChart();
}

function updateCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    if (budgetData.all_categories.length === 0) {
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return;
    }
    
    const labels = budgetData.all_categories.map(c => c.name);
    const data = budgetData.all_categories.map(c => c.total);
    const colors = budgetData.all_categories.map(c => c.color);
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const percentage = budgetData.all_categories[context.dataIndex].percentage;
                            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateBudgetChart() {
    const ctx = document.getElementById('budgetChart');
    
    if (budgetChart) {
        budgetChart.destroy();
    }
    
    budgetChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Budget Overview'],
            datasets: [
                {
                    label: 'Income',
                    data: [budgetData.income],
                    backgroundColor: '#38ef7d',
                    borderRadius: 8
                },
                {
                    label: 'Spent',
                    data: [budgetData.spent],
                    backgroundColor: '#f45c43',
                    borderRadius: 8
                },
                {
                    label: 'Remaining',
                    data: [budgetData.remaining],
                    backgroundColor: '#667eea',
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

function renderTrendChart(trends) {
    const ctx = document.getElementById('trendChart');
    
    if (trendChart) {
        trendChart.destroy();
    }
    
    if (trends.length === 0) {
        return;
    }
    
    const labels = trends.map(t => t.label);
    const income = trends.map(t => t.income);
    const spent = trends.map(t => t.spent);
    const savings = trends.map(t => t.savings);
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: income,
                    borderColor: '#38ef7d',
                    backgroundColor: 'rgba(56, 239, 125, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Spent',
                    data: spent,
                    borderColor: '#f45c43',
                    backgroundColor: 'rgba(244, 92, 67, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Savings',
                    data: savings,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

// ==================== MODALS ====================

function openAddModal() {
    document.getElementById('addModal').classList.add('show');
    document.getElementById('amountInput').focus();
}

function closeAddModal() {
    document.getElementById('addModal').classList.remove('show');
    // Reset form
    document.getElementById('amountInput').value = '';
    document.getElementById('descriptionInput').value = '';
    document.getElementById('dateInput').value = new Date().toISOString().slice(0, 10);
}

function editIncome() {
    document.getElementById('incomeInputModal').value = budgetData.income;
    document.getElementById('incomeModal').classList.add('show');
    document.getElementById('incomeInputModal').focus();
}

function closeIncomeModal() {
    document.getElementById('incomeModal').classList.remove('show');
}

function viewAllCategories() {
    const listContainer = document.getElementById('allCategoriesList');
    listContainer.innerHTML = '';
    
    budgetData.all_categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.style.marginBottom = '1rem';
        item.innerHTML = `
            <div class="category-info">
                <span class="category-icon">${cat.icon}</span>
                <div>
                    <div class="category-name">${cat.name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-light);">${cat.count} transactions</div>
                </div>
            </div>
            <div class="category-amount">
                <span class="category-value">$${cat.total.toFixed(2)}</span>
                <span class="category-percent">${cat.percentage}%</span>
            </div>
        `;
        listContainer.appendChild(item);
    });
    
    document.getElementById('categoryModal').classList.add('show');
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('show');
}

// ==================== ACTIONS ====================

async function saveIncome() {
    const income = parseFloat(document.getElementById('incomeInputModal').value) || 0;
    
    if (income < 0) {
        showToast('Income cannot be negative', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/budget/${currentMonth}/income`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ income })
        });
        
        if (response.ok) {
            showToast('Income updated successfully! 🎉', 'success');
            closeIncomeModal();
            await refreshAll();
        } else {
            throw new Error('Failed to update income');
        }
    } catch (error) {
        console.error('Error updating income:', error);
        showToast('Error updating income', 'error');
    }
}

async function addTransaction() {
    const amount = parseFloat(document.getElementById('amountInput').value) || 0;
    const category = document.getElementById('categoryInput').value;
    const description = document.getElementById('descriptionInput').value.trim();
    const date = document.getElementById('dateInput').value;
    
    if (amount <= 0) {
        showToast('Amount must be greater than 0', 'error');
        return;
    }
    
    if (!category) {
        showToast('Please select a category', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, category, description, date })
        });
        
        if (response.ok) {
            showToast('Expense added! 💰', 'success');
            closeAddModal();
            await refreshAll();
        } else {
            const data = await response.json();
            throw new Error(data.error || 'Failed to add transaction');
        }
    } catch (error) {
        console.error('Error adding transaction:', error);
        showToast(error.message || 'Error adding expense', 'error');
    }
}

async function deleteTransaction(transId) {
    if (!confirm('Delete this transaction?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/transaction/${transId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Transaction deleted', 'success');
            await refreshAll();
        } else {
            throw new Error('Failed to delete transaction');
        }
    } catch (error) {
        console.error('Error deleting transaction:', error);
        showToast('Error deleting transaction', 'error');
    }
}

// ==================== UTILITIES ====================

async function refreshAll() {
    await loadBudgetData();
    await loadTransactions();
    await loadWeekCalendar();
    await loadTrends();
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// ==================== KEYBOARD SHORTCUTS ====================

document.addEventListener('keydown', function(e) {
    // ESC to close modals
    if (e.key === 'Escape') {
        closeAddModal();
        closeIncomeModal();
        closeCategoryModal();
    }
    
    // Ctrl/Cmd + N to add new transaction
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openAddModal();
    }
});

// Close modal when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
});

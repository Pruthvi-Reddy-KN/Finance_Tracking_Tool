// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDateInputs();
    setupFormHandlers();
    setupCustomCategoryHandlers();
});

// Initialize date inputs with today's date
function initializeDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('income-date').value = today;
    document.getElementById('expense-date').value = today;
}

// Setup form handlers
function setupFormHandlers() {
    // Income form
    document.getElementById('income-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addTransaction('income');
    });

    // Expense form
    document.getElementById('expense-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addTransaction('expense');
    });

    // Budget form
    document.getElementById('budget-form').addEventListener('submit', function(e) {
        e.preventDefault();
        setBudget();
    });
}

// Setup custom category handlers
function setupCustomCategoryHandlers() {
    // Expense category custom input
    const expenseSelect = document.getElementById('expense-category');
    const expenseCustom = document.getElementById('expense-category-custom');
    
    expenseCustom.addEventListener('input', function() {
        if (this.value) {
            expenseSelect.value = '';
        }
    });
    
    expenseSelect.addEventListener('change', function() {
        if (this.value) {
            expenseCustom.value = '';
        }
    });

    // Budget category custom input
    const budgetSelect = document.getElementById('budget-category');
    const budgetCustom = document.getElementById('budget-category-custom');
    
    budgetCustom.addEventListener('input', function() {
        if (this.value) {
            budgetSelect.value = '';
        }
    });
    
    budgetSelect.addEventListener('change', function() {
        if (this.value) {
            budgetCustom.value = '';
        }
    });
}

// Modal functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    clearForm(modalId);
}

function clearForm(modalId) {
    const form = document.querySelector(`#${modalId} form`);
    if (form) {
        form.reset();
        // Reset date inputs to today
        const dateInputs = form.querySelectorAll('input[type="date"]');
        const today = new Date().toISOString().split('T')[0];
        dateInputs.forEach(input => input.value = today);
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        clearForm(event.target.id);
    }
});

// Add transaction
async function addTransaction(type) {
    showLoading();
    
    try {
        let amount, category, description, date;
        
        if (type === 'income') {
            amount = parseFloat(document.getElementById('income-amount').value);
            category = document.getElementById('income-category').value;
            description = document.getElementById('income-description').value;
            date = document.getElementById('income-date').value;
        } else {
            amount = parseFloat(document.getElementById('expense-amount').value);
            
            // Get category from select or custom input
            const categorySelect = document.getElementById('expense-category').value;
            const categoryCustom = document.getElementById('expense-category-custom').value;
            category = categoryCustom || categorySelect;
            
            description = document.getElementById('expense-description').value;
            date = document.getElementById('expense-date').value;
        }

        if (!amount || amount <= 0) {
            throw new Error('Please enter a valid amount');
        }

        if (!category) {
            throw new Error('Please select or enter a category');
        }

        const response = await fetch('/api/add_transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                category: category,
                description: description,
                transaction_type: type,
                date: date
            })
        });

        const result = await response.json();

        if (result.success) {
            hideModal(`${type}-modal`);
            showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`, 'success');
            await refreshDashboard();
        } else {
            throw new Error(result.error || 'Failed to add transaction');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Set budget
async function setBudget() {
    showLoading();
    
    try {
        // Get category from select or custom input
        const categorySelect = document.getElementById('budget-category').value;
        const categoryCustom = document.getElementById('budget-category-custom').value;
        const category = categoryCustom || categorySelect;
        
        const monthlyLimit = parseFloat(document.getElementById('budget-limit').value);

        if (!category) {
            throw new Error('Please select or enter a category');
        }

        if (!monthlyLimit || monthlyLimit <= 0) {
            throw new Error('Please enter a valid budget limit');
        }

        const response = await fetch('/api/set_budget', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                category: category,
                monthly_limit: monthlyLimit
            })
        });

        const result = await response.json();

        if (result.success) {
            hideModal('budget-modal');
            showNotification('Budget set successfully!', 'success');
            await refreshDashboard();
        } else {
            throw new Error(result.error || 'Failed to set budget');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Delete transaction
async function deleteTransaction(transactionId) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }

    showLoading();
    
    try {
        const response = await fetch('/api/delete_transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transaction_id: transactionId
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Transaction deleted successfully!', 'success');
            await refreshDashboard();
        } else {
            throw new Error(result.error || 'Failed to delete transaction');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Refresh dashboard data
async function refreshDashboard() {
    try {
        const response = await fetch('/api/dashboard_data');
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Update balance
        document.getElementById('current-balance').textContent = `$${data.balance.toFixed(2)}`;

        // Update monthly summary
        updateMonthlySummary(data.monthly_summary);

        // Update budget status
        updateBudgetStatus(data.budget_status);

        // Update recent transactions
        updateRecentTransactions(data.recent_transactions);

    } catch (error) {
        console.error('Error refreshing dashboard:', error);
        showNotification('Error refreshing data', 'error');
    }
}

// Update monthly summary
function updateMonthlySummary(summary) {
    const stats = document.querySelectorAll('.monthly-stats .stat-value');
    if (stats.length >= 3) {
        stats[0].textContent = `$${summary.total_income.toFixed(2)}`;
        stats[1].textContent = `$${summary.total_expenses.toFixed(2)}`;
        
        const netElement = stats[2];
        netElement.textContent = `$${summary.net_income.toFixed(2)}`;
        netElement.className = `stat-value ${summary.net_income >= 0 ? 'income' : 'expense'}`;
    }
}

// Update budget status
function updateBudgetStatus(budgetStatus) {
    const budgetContainer = document.getElementById('budget-status');
    
    if (Object.keys(budgetStatus).length === 0) {
        budgetContainer.innerHTML = '<p class="no-data">No budgets set. Click "Set Budget" to get started!</p>';
        return;
    }

    let html = '';
    for (const [category, status] of Object.entries(budgetStatus)) {
        const progressWidth = Math.min(status.percentage, 100);
        const overBudgetClass = status.over_budget ? 'over-budget' : '';
        
        html += `
            <div class="budget-item">
                <div class="budget-header">
                    <span class="category">${category}</span>
                    <span class="amount">$${status.current_spent.toFixed(2)} / $${status.monthly_limit.toFixed(2)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${overBudgetClass}" style="width: ${progressWidth}%"></div>
                </div>
                <div class="budget-info">
                    <span class="percentage">${status.percentage.toFixed(1)}%</span>
                    <span class="remaining ${overBudgetClass}">
                        ${status.over_budget ? 'Over by' : 'Remaining'}: $${Math.abs(status.remaining).toFixed(2)}
                    </span>
                </div>
            </div>
        `;
    }
    
    budgetContainer.innerHTML = html;
}

// Update recent transactions
function updateRecentTransactions(transactions) {
    const transactionContainer = document.getElementById('recent-transactions');
    
    if (transactions.length === 0) {
        transactionContainer.innerHTML = '<p class="no-data">No transactions yet. Add your first transaction!</p>';
        return;
    }

    let html = '';
    for (const transaction of transactions) {
        const sign = transaction.transaction_type === 'income' ? '+' : '-';
        html += `
            <div class="transaction-item" data-id="${transaction.id}">
                <div class="transaction-info">
                    <div class="transaction-header">
                        <span class="category">${transaction.category}</span>
                        <span class="amount ${transaction.transaction_type}">
                            ${sign}$${transaction.amount.toFixed(2)}
                        </span>
                    </div>
                    <div class="transaction-details">
                        <span class="description">${transaction.description || 'No description'}</span>
                        <span class="date">${transaction.date}</span>
                    </div>
                </div>
                <button class="delete-btn" onclick="deleteTransaction('${transaction.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }
    
    transactionContainer.innerHTML = html;
}

// Loading functions
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

// Notification functions
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notification-message');
    
    messageElement.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        hideNotification();
    }, 5000);
}

function hideNotification() {
    document.getElementById('notification').classList.add('hidden');
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Auto-refresh dashboard every 30 seconds
setInterval(refreshDashboard, 30000);
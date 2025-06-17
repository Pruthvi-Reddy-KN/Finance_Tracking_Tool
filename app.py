from flask import Flask, render_template, request, jsonify, redirect, url_for
import json
import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from collections import defaultdict
import os

app = Flask(__name__)

@dataclass
class Transaction:
    """Represents a financial transaction"""
    id: str
    date: str
    amount: float
    category: str
    description: str
    transaction_type: str  # 'income' or 'expense'
    
    def to_dict(self) -> dict:
        return asdict(self)

@dataclass
class Budget:
    """Represents a budget for a category"""
    category: str
    monthly_limit: float
    current_spent: float = 0.0
    
    def to_dict(self) -> dict:
        return asdict(self)

class FinanceTracker:
    """Main class for managing personal finances"""
    
    def __init__(self, data_file: str = "finance_data.json"):
        self.data_file = data_file
        self.transactions: List[Transaction] = []
        self.budgets: Dict[str, Budget] = {}
        self.load_data()
    
    def load_data(self):
        """Load existing financial data from file"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r') as f:
                    data = json.load(f)
                
                # Load transactions
                for t_data in data.get('transactions', []):
                    transaction = Transaction(**t_data)
                    self.transactions.append(transaction)
                
                # Load budgets
                for b_data in data.get('budgets', []):
                    budget = Budget(**b_data)
                    self.budgets[budget.category] = budget
                    
            except (json.JSONDecodeError, FileNotFoundError):
                print("No existing data found or file corrupted. Starting fresh.")
    
    def save_data(self):
        """Save financial data to file"""
        data = {
            'transactions': [t.to_dict() for t in self.transactions],
            'budgets': [b.to_dict() for b in self.budgets.values()]
        }
        
        with open(self.data_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def add_transaction(self, amount: float, category: str, description: str, 
                       transaction_type: str, date: Optional[str] = None):
        """Add a new transaction"""
        if date is None:
            date = datetime.datetime.now().strftime("%Y-%m-%d")
        
        transaction_id = f"{transaction_type}_{len(self.transactions) + 1}_{date.replace('-', '')}"
        
        transaction = Transaction(
            id=transaction_id,
            date=date,
            amount=amount,
            category=category,
            description=description,
            transaction_type=transaction_type
        )
        
        self.transactions.append(transaction)
        
        # Update budget if it's an expense
        if transaction_type == 'expense' and category in self.budgets:
            self.update_budget_spending(category)
        
        self.save_data()
        return transaction
    
    def update_budget_spending(self, category: str):
        """Update current spending for a budget category"""
        if category not in self.budgets:
            return
            
        current_month = datetime.datetime.now().strftime("%Y-%m")
        current_spent = sum(
            t.amount for t in self.transactions
            if t.category == category and t.transaction_type == "expense"
            and t.date.startswith(current_month)
        )
        self.budgets[category].current_spent = current_spent
    
    def set_budget(self, category: str, monthly_limit: float):
        """Set or update budget for a category"""
        if category in self.budgets:
            self.budgets[category].monthly_limit = monthly_limit
        else:
            self.budgets[category] = Budget(category, monthly_limit)
        
        self.update_budget_spending(category)
        self.save_data()
        return self.budgets[category]
    
    def get_balance(self) -> float:
        """Calculate current balance"""
        total_income = sum(t.amount for t in self.transactions if t.transaction_type == "income")
        total_expenses = sum(t.amount for t in self.transactions if t.transaction_type == "expense")
        return total_income - total_expenses
    
    def get_monthly_summary(self, year: int, month: int) -> Dict:
        """Get financial summary for a specific month"""
        month_str = f"{year}-{month:02d}"
        
        monthly_transactions = [
            t for t in self.transactions 
            if t.date.startswith(month_str)
        ]
        
        income = sum(t.amount for t in monthly_transactions if t.transaction_type == "income")
        expenses = sum(t.amount for t in monthly_transactions if t.transaction_type == "expense")
        
        # Category breakdown
        expense_by_category = defaultdict(float)
        income_by_category = defaultdict(float)
        
        for t in monthly_transactions:
            if t.transaction_type == "expense":
                expense_by_category[t.category] += t.amount
            else:
                income_by_category[t.category] += t.amount
        
        return {
            'month': f"{year}-{month:02d}",
            'total_income': income,
            'total_expenses': expenses,
            'net_income': income - expenses,
            'expense_by_category': dict(expense_by_category),
            'income_by_category': dict(income_by_category)
        }
    
    def get_recent_transactions(self, limit: int = 10) -> List[Transaction]:
        """Get recent transactions"""
        return sorted(self.transactions, key=lambda x: x.date, reverse=True)[:limit]
    
    def get_budget_status(self) -> Dict:
        """Get current budget status"""
        current_month = datetime.datetime.now().strftime("%Y-%m")
        budget_status = {}
        
        for category, budget in self.budgets.items():
            self.update_budget_spending(category)
            remaining = budget.monthly_limit - budget.current_spent
            percentage = (budget.current_spent / budget.monthly_limit) * 100 if budget.monthly_limit > 0 else 0
            
            budget_status[category] = {
                'current_spent': budget.current_spent,
                'monthly_limit': budget.monthly_limit,
                'remaining': remaining,
                'percentage': percentage,
                'over_budget': remaining < 0
            }
        
        return budget_status
    
    def delete_transaction(self, transaction_id: str) -> bool:
        """Delete a transaction by ID"""
        for i, transaction in enumerate(self.transactions):
            if transaction.id == transaction_id:
                del self.transactions[i]
                self.save_data()
                return True
        return False

# Initialize the finance tracker
tracker = FinanceTracker()

@app.route('/')
def index():
    """Main dashboard page"""
    balance = tracker.get_balance()
    recent_transactions = tracker.get_recent_transactions(10)
    budget_status = tracker.get_budget_status()
    
    # Get current month summary
    now = datetime.datetime.now()
    monthly_summary = tracker.get_monthly_summary(now.year, now.month)
    
    return render_template('index.html', 
                         balance=balance,
                         recent_transactions=recent_transactions,
                         budget_status=budget_status,
                         monthly_summary=monthly_summary)

@app.route('/api/add_transaction', methods=['POST'])
def add_transaction():
    """API endpoint to add a new transaction"""
    try:
        data = request.get_json()
        
        transaction = tracker.add_transaction(
            amount=float(data['amount']),
            category=data['category'],
            description=data.get('description', ''),
            transaction_type=data['transaction_type'],
            date=data.get('date')
        )
        
        return jsonify({
            'success': True,
            'transaction': transaction.to_dict(),
            'new_balance': tracker.get_balance()
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/set_budget', methods=['POST'])
def set_budget():
    """API endpoint to set or update a budget"""
    try:
        data = request.get_json()
        
        budget = tracker.set_budget(
            category=data['category'],
            monthly_limit=float(data['monthly_limit'])
        )
        
        return jsonify({
            'success': True,
            'budget': budget.to_dict(),
            'budget_status': tracker.get_budget_status()
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/delete_transaction', methods=['POST'])
def delete_transaction():
    """API endpoint to delete a transaction"""
    try:
        data = request.get_json()
        transaction_id = data['transaction_id']
        
        success = tracker.delete_transaction(transaction_id)
        
        if success:
            return jsonify({
                'success': True,
                'new_balance': tracker.get_balance()
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Transaction not found'
            }), 404
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/monthly_summary/<int:year>/<int:month>')
def monthly_summary(year, month):
    """API endpoint to get monthly summary"""
    try:
        summary = tracker.get_monthly_summary(year, month)
        return jsonify(summary)
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 400

@app.route('/api/dashboard_data')
def dashboard_data():
    """API endpoint to get dashboard data"""
    try:
        balance = tracker.get_balance()
        recent_transactions = [t.to_dict() for t in tracker.get_recent_transactions(10)]
        budget_status = tracker.get_budget_status()
        
        # Get current month summary
        now = datetime.datetime.now()
        monthly_summary = tracker.get_monthly_summary(now.year, now.month)
        
        return jsonify({
            'balance': balance,
            'recent_transactions': recent_transactions,
            'budget_status': budget_status,
            'monthly_summary': monthly_summary
        })
    
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
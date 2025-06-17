# Personal Finance Tracking Tool

A modern, responsive, and user-friendly personal finance tracker built with **Flask**, **Python**, and **JavaScript**. This app lets users manage their income, expenses, and budgets with beautiful modal forms, real-time updates, and persistent data storage.

---

## Features

- **Quick Actions**
  - Add income or expense entries instantly using intuitive modal forms.
  
- **Budget Tracking**
  - Visual progress bars show real-time spending vs. monthly budget limits.

- **Monthly Overview**
  - Displays income, expenses, and net balance for the current month.

- **Recent Transactions**
  - Easily view and delete recent transactions for better control.

- **Real-time Updates**
  - All actions reflect immediately without requiring a page refresh.

- **Responsive Design**
  - Optimized for both desktop and mobile devices.

---

## Tech Stack

- **Backend:** Flask (Python)
- **Frontend:** HTML, CSS, JavaScript
- **Storage:** `finance_data.json` (automatic save/load)

---

## Data Persistence

All data is stored in `finance_data.json` and automatically:
- **Loaded** when the server starts
- **Saved** whenever you add or delete a transaction

No need to worry about manual data management!

---


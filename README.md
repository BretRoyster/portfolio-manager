# Portfolio Manager

A comprehensive portfolio management application built with Node.js and vanilla JavaScript that helps you track investments, plan DCA strategies, and reconcile accounts.

## Features

### 📊 **Portfolio Tracking**
- Track holdings across multiple accounts and asset classes
- Real-time portfolio value and gain/loss calculations
- Visual asset allocation with interactive charts
- Transaction history and detailed reporting

### 🎯 **DCA Planning & Goal Setting**
- Set target asset allocation percentages
- Plan future holdings and investment targets
- Calculate weekly, monthly, and annual DCA amounts
- Track progress toward investment goals
- Smart rebalancing recommendations

### 🔄 **Account Reconciliation**
- Compare tracked holdings vs actual account balances
- Identify discrepancies and variances
- Track reconciliation history
- Visual variance indicators

### 🎨 **Dynamic Asset Classes**
- Create custom asset classes with personalized names
- Visual color coding for easy organization
- Edit and manage asset classes as your strategy evolves
- Smart color picker with automatic unique color selection

### 💼 **Account Management**
- Support for multiple account types (401k, IRA, Roth, HSA, etc.)
- Account-specific holding views
- Provider tracking and organization

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd portfolio
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
node server.js
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

### Adding Your First Investment
1. Click "Manage Accounts" to create investment accounts
2. Click "Asset Classes" to create or customize asset categories
3. Click "Add Holding" to add your first investment
4. Enter the symbol, shares, purchase price, and account details

### Setting Up DCA Planning
1. Click "DCA Planning" in the header
2. **Setup Tab**: Enter your annual investment amount and time horizon
3. **Asset Goals Tab**: Set target allocation percentages (must total 100%)
4. **Holding Goals Tab**: Set specific dollar targets for individual investments
5. **DCA Schedule Tab**: View your weekly/monthly investment plan

### Reconciling Accounts
1. Click "Reconcile Accounts" in the header
2. Enter actual balances from your account statements
3. Review variances between tracked and actual amounts
4. Investigate discrepancies and update holdings as needed

## Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Data Storage**: JSON file-based storage
- **Styling**: Custom CSS with responsive design
- **Icons**: Font Awesome

## Project Structure

```
portfolio/
├── server.js              # Express.js server
├── package.json           # Node.js dependencies
├── data/                  # Data storage
│   └── portfolio.json     # Portfolio data file
├── public/                # Frontend files
│   ├── index.html         # Main HTML file
│   ├── script.js          # Frontend JavaScript
│   └── styles.css         # CSS styling
└── README.md              # This file
```

## API Endpoints

### Holdings
- `GET /api/holdings` - Get all holdings
- `POST /api/holdings` - Add new holding
- `PUT /api/holdings/:id` - Update holding
- `DELETE /api/holdings/:id` - Delete holding

### Accounts
- `GET /api/accounts` - Get all accounts
- `POST /api/accounts` - Add new account
- `DELETE /api/accounts/:id` - Delete account
- `PUT /api/accounts/:id/balance` - Update account balance

### Asset Classes
- `GET /api/asset-classes` - Get all asset classes
- `POST /api/asset-classes` - Add new asset class
- `PUT /api/asset-classes/:id` - Update asset class
- `DELETE /api/asset-classes/:id` - Delete asset class

### DCA Planning
- `GET /api/dca/plan` - Get DCA plan
- `PUT /api/dca/plan` - Update DCA plan
- `GET /api/dca/recommendations` - Get DCA recommendations

### Portfolio Analytics
- `GET /api/portfolio/summary` - Get portfolio summary
- `GET /api/asset-allocation` - Get asset allocation
- `GET /api/accounts/reconciliation` - Get reconciliation data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or support, please open an issue in the repository.

---

**Happy Investing! 📈**
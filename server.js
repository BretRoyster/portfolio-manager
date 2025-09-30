const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = '/MegaSync/!finances/portfolio-manager-data/portfolio.json';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    await fs.access('./data');
  } catch {
    await fs.mkdir('./data');
  }
}

// Initialize portfolio data file
async function initializeData() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    const initialData = {
      assetClasses: [
        { id: 'stocks', name: 'Stocks', description: 'Individual stocks and equity securities', color: '#667eea' },
        { id: 'bonds', name: 'Bonds', description: 'Government and corporate bonds', color: '#38a169' },
        { id: 'realestate', name: 'Real Estate', description: 'REITs and real estate investments', color: '#e53e3e' },
        { id: 'commodities', name: 'Commodities', description: 'Gold, oil, and other commodities', color: '#d69e2e' },
        { id: 'crypto', name: 'Cryptocurrency', description: 'Bitcoin, Ethereum, and other crypto', color: '#9f7aea' },
        { id: 'cash', name: 'Cash & Equivalents', description: 'Money market funds and cash', color: '#718096' }
      ],
      accountTypes: [
        { id: 'taxable', name: 'Taxable Brokerage', description: 'Regular investment accounts', icon: 'fas fa-chart-line' },
        { id: '401k', name: '401(k)', description: 'Employer-sponsored retirement plan', icon: 'fas fa-building' },
        { id: 'ira', name: 'Traditional IRA', description: 'Individual Retirement Account', icon: 'fas fa-piggy-bank' },
        { id: 'roth', name: 'Roth IRA', description: 'Tax-free retirement account', icon: 'fas fa-coins' },
        { id: '403b', name: '403(b)', description: 'Non-profit retirement plan', icon: 'fas fa-graduation-cap' },
        { id: 'hsa', name: 'HSA', description: 'Health Savings Account', icon: 'fas fa-heartbeat' },
        { id: '529', name: '529 Plan', description: 'Education savings plan', icon: 'fas fa-university' },
        { id: 'other', name: 'Other', description: 'Other account types', icon: 'fas fa-folder' }
      ],
      accounts: [],
      holdings: [],
      transactions: [],
      totalValue: 0,
      totalGainLoss: 0
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

// Read portfolio data
async function readPortfolioData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading portfolio data:', error);
    return { 
      assetClasses: [],
      accountTypes: [],
      accounts: [],
      holdings: [], 
      transactions: [], 
      totalValue: 0, 
      totalGainLoss: 0 
    };
  }
}

// Write portfolio data
async function writePortfolioData(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing portfolio data:', error);
  }
}

// API Routes

// Get all holdings
app.get('/api/holdings', async (req, res) => {
  try {
    const data = await readPortfolioData();
    res.json(data.holdings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch holdings' });
  }
});

// Add new holding
app.post('/api/holdings', async (req, res) => {
  try {
    const { symbol, name, shares, purchasePrice, purchaseDate, assetClass, accountId } = req.body;
    
    if (!symbol || !shares || !purchasePrice || !assetClass || !accountId) {
      return res.status(400).json({ error: 'Symbol, shares, purchase price, asset class, and account are required' });
    }

    const data = await readPortfolioData();
    const newHolding = {
      id: Date.now().toString(),
      symbol: symbol.toUpperCase(),
      name: name || symbol.toUpperCase(),
      assetClass: assetClass,
      accountId: accountId,
      shares: parseFloat(shares),
      purchasePrice: parseFloat(purchasePrice),
      purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
      currentPrice: parseFloat(purchasePrice), // Will be updated with real data later
      totalValue: parseFloat(shares) * parseFloat(purchasePrice),
      gainLoss: 0,
      gainLossPercent: 0
    };

    data.holdings.push(newHolding);
    
    // Add transaction record
    const transaction = {
      id: Date.now().toString() + '_tx',
      type: 'buy',
      symbol: newHolding.symbol,
      shares: newHolding.shares,
      price: newHolding.purchasePrice,
      date: newHolding.purchaseDate,
      total: newHolding.totalValue
    };
    data.transactions.push(transaction);

    await writePortfolioData(data);
    res.status(201).json(newHolding);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add holding' });
  }
});

// Update holding
app.put('/api/holdings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const data = await readPortfolioData();
    const holdingIndex = data.holdings.findIndex(h => h.id === id);
    
    if (holdingIndex === -1) {
      return res.status(404).json({ error: 'Holding not found' });
    }

    data.holdings[holdingIndex] = { ...data.holdings[holdingIndex], ...updates };
    
    // Recalculate values
    const holding = data.holdings[holdingIndex];
    holding.totalValue = holding.shares * holding.currentPrice;
    holding.gainLoss = holding.totalValue - (holding.shares * holding.purchasePrice);
    holding.gainLossPercent = ((holding.currentPrice - holding.purchasePrice) / holding.purchasePrice) * 100;

    await writePortfolioData(data);
    res.json(data.holdings[holdingIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update holding' });
  }
});

// Delete holding
app.delete('/api/holdings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readPortfolioData();
    
    const initialLength = data.holdings.length;
    data.holdings = data.holdings.filter(h => h.id !== id);
    
    if (data.holdings.length === initialLength) {
      return res.status(404).json({ error: 'Holding not found' });
    }

    await writePortfolioData(data);
    res.json({ message: 'Holding deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete holding' });
  }
});

// Get portfolio summary
app.get('/api/portfolio/summary', async (req, res) => {
  try {
    const data = await readPortfolioData();
    
    const totalValue = data.holdings.reduce((sum, holding) => sum + holding.totalValue, 0);
    const totalCost = data.holdings.reduce((sum, holding) => sum + (holding.shares * holding.purchasePrice), 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    const summary = {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      holdingsCount: data.holdings.length
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get portfolio summary' });
  }
});

// Get transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const data = await readPortfolioData();
    res.json(data.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get asset classes
app.get('/api/asset-classes', async (req, res) => {
  try {
    const data = await readPortfolioData();
    res.json(data.assetClasses || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch asset classes' });
  }
});

// Add new asset class
app.post('/api/asset-classes', async (req, res) => {
  try {
    const { name, description, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Asset class name is required' });
    }

    const data = await readPortfolioData();
    const newAssetClass = {
      id: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      name: name,
      description: description || '',
      color: color || '#667eea'
    };

    // Check if asset class already exists
    const existingAssetClass = data.assetClasses.find(ac => ac.id === newAssetClass.id);
    if (existingAssetClass) {
      return res.status(400).json({ error: 'Asset class with this name already exists' });
    }

    data.assetClasses.push(newAssetClass);
    await writePortfolioData(data);
    res.status(201).json(newAssetClass);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add asset class' });
  }
});

// Update asset class
app.put('/api/asset-classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;
    
    const data = await readPortfolioData();
    const assetClassIndex = data.assetClasses.findIndex(ac => ac.id === id);
    
    if (assetClassIndex === -1) {
      return res.status(404).json({ error: 'Asset class not found' });
    }

    // Update asset class
    data.assetClasses[assetClassIndex] = {
      ...data.assetClasses[assetClassIndex],
      name: name || data.assetClasses[assetClassIndex].name,
      description: description !== undefined ? description : data.assetClasses[assetClassIndex].description,
      color: color || data.assetClasses[assetClassIndex].color
    };

    await writePortfolioData(data);
    res.json(data.assetClasses[assetClassIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update asset class' });
  }
});

// Delete asset class
app.delete('/api/asset-classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readPortfolioData();
    
    // Check if any holdings use this asset class
    const holdingsUsingAssetClass = data.holdings.filter(h => h.assetClass === id);
    if (holdingsUsingAssetClass.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete asset class. ${holdingsUsingAssetClass.length} holdings are using this asset class.` 
      });
    }
    
    const initialLength = data.assetClasses.length;
    data.assetClasses = data.assetClasses.filter(ac => ac.id !== id);
    
    if (data.assetClasses.length === initialLength) {
      return res.status(404).json({ error: 'Asset class not found' });
    }

    // Clean up DCA plan references
    if (data.dcaPlan && data.dcaPlan.targetAllocations) {
      data.dcaPlan.targetAllocations = data.dcaPlan.targetAllocations.filter(ta => ta.assetClassId !== id);
    }

    await writePortfolioData(data);
    res.json({ message: 'Asset class deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete asset class' });
  }
});

// Get asset allocation
app.get('/api/asset-allocation', async (req, res) => {
  try {
    const data = await readPortfolioData();
    
    // Group holdings by asset class and calculate totals
    const allocation = {};
    
    data.holdings.forEach(holding => {
      if (!allocation[holding.assetClass]) {
        allocation[holding.assetClass] = {
          totalValue: 0,
          totalCost: 0,
          holdings: []
        };
      }
      allocation[holding.assetClass].totalValue += holding.totalValue;
      allocation[holding.assetClass].totalCost += (holding.shares * holding.purchasePrice);
      allocation[holding.assetClass].holdings.push(holding);
    });

    // Calculate percentages and add asset class info
    const totalPortfolioValue = Object.values(allocation).reduce((sum, asset) => sum + asset.totalValue, 0);
    
    const allocationWithDetails = Object.entries(allocation).map(([assetClassId, details]) => {
      const assetClassInfo = data.assetClasses.find(ac => ac.id === assetClassId) || 
                           { id: assetClassId, name: assetClassId, color: '#718096' };
      
      return {
        ...assetClassInfo,
        ...details,
        percentage: totalPortfolioValue > 0 ? (details.totalValue / totalPortfolioValue) * 100 : 0,
        gainLoss: details.totalValue - details.totalCost,
        gainLossPercent: details.totalCost > 0 ? ((details.totalValue - details.totalCost) / details.totalCost) * 100 : 0
      };
    });

    res.json(allocationWithDetails);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get asset allocation' });
  }
});

// Get holdings by asset class
app.get('/api/holdings/by-asset-class/:assetClass', async (req, res) => {
  try {
    const { assetClass } = req.params;
    const data = await readPortfolioData();
    
    const holdings = data.holdings.filter(h => h.assetClass === assetClass);
    res.json(holdings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch holdings for asset class' });
  }
});

// Get account types
app.get('/api/account-types', async (req, res) => {
  try {
    const data = await readPortfolioData();
    res.json(data.accountTypes || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch account types' });
  }
});

// Get accounts
app.get('/api/accounts', async (req, res) => {
  try {
    const data = await readPortfolioData();
    res.json(data.accounts || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Add new account
app.post('/api/accounts', async (req, res) => {
  try {
    const { name, accountType, provider, websiteUrl } = req.body;
    
    if (!name || !accountType) {
      return res.status(400).json({ error: 'Account name and type are required' });
    }

    const data = await readPortfolioData();
    const newAccount = {
      id: Date.now().toString(),
      name: name,
      accountType: accountType,
      provider: provider || '',
      websiteUrl: websiteUrl || '',
      createdDate: new Date().toISOString().split('T')[0]
    };

    if (!data.accounts) {
      data.accounts = [];
    }
    data.accounts.push(newAccount);
    
    await writePortfolioData(data);
    res.status(201).json(newAccount);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add account' });
  }
});

// Update account actual balance (more specific route - must come before general update)
app.put('/api/accounts/:id/balance', async (req, res) => {
  try {
    const { id } = req.params;
    const { actualTotal } = req.body;
    
    if (typeof actualTotal !== 'number') {
      return res.status(400).json({ error: 'Actual total must be a number' });
    }

    const data = await readPortfolioData();
    const accountIndex = data.accounts.findIndex(a => a.id === id);
    
    if (accountIndex === -1) {
      return res.status(404).json({ error: 'Account not found' });
    }

    data.accounts[accountIndex].actualTotal = actualTotal;
    data.accounts[accountIndex].lastReconciled = new Date().toISOString();

    await writePortfolioData(data);
    res.json(data.accounts[accountIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update account balance' });
  }
});

// Update account (general update route)
app.put('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, accountType, provider, websiteUrl } = req.body;
    
    if (!name || !accountType) {
      return res.status(400).json({ error: 'Account name and type are required' });
    }

    const data = await readPortfolioData();
    const accountIndex = data.accounts.findIndex(a => a.id === id);
    
    if (accountIndex === -1) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Update account
    data.accounts[accountIndex] = {
      ...data.accounts[accountIndex],
      name,
      accountType,
      provider: provider || '',
      websiteUrl: websiteUrl || ''
    };

    await writePortfolioData(data);
    res.json(data.accounts[accountIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Delete account
app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readPortfolioData();
    
    // Check if any holdings are in this account
    const holdingsInAccount = data.holdings.filter(h => h.accountId === id);
    if (holdingsInAccount.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete account. ${holdingsInAccount.length} holdings are still in this account.` 
      });
    }
    
    const initialLength = data.accounts?.length || 0;
    data.accounts = (data.accounts || []).filter(a => a.id !== id);
    
    if (data.accounts.length === initialLength) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await writePortfolioData(data);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Get holdings by account
app.get('/api/holdings/by-account/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const data = await readPortfolioData();
    
    const holdings = data.holdings.filter(h => h.accountId === accountId);
    res.json(holdings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch holdings for account' });
  }
});

// Get account reconciliation data
app.get('/api/accounts/reconciliation', async (req, res) => {
  try {
    const data = await readPortfolioData();
    
    const reconciliation = data.accounts.map(account => {
      const holdings = data.holdings.filter(h => h.accountId === account.id);
      const calculatedTotal = holdings.reduce((sum, holding) => sum + holding.totalValue, 0);
      const accountType = data.accountTypes.find(at => at.id === account.accountType);
      
      return {
        id: account.id,
        name: account.name,
        accountType: accountType?.name || account.accountType,
        provider: account.provider,
        calculatedTotal,
        actualTotal: account.actualTotal || 0,
        variance: (account.actualTotal || 0) - calculatedTotal,
        variancePercent: calculatedTotal > 0 ? (((account.actualTotal || 0) - calculatedTotal) / calculatedTotal) * 100 : 0,
        holdingsCount: holdings.length,
        lastReconciled: account.lastReconciled || null
      };
    });

    res.json(reconciliation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get reconciliation data' });
  }
});


// DCA Planning Endpoints

// Get DCA plan
app.get('/api/dca/plan', async (req, res) => {
  try {
    const data = await readPortfolioData();
    const dcaPlan = data.dcaPlan || {
      annualCashflow: 0,
      timeHorizonYears: 1,
      targetAllocations: [],
      holdingTargets: [],
      createdDate: null,
      lastUpdated: null
    };
    res.json(dcaPlan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get DCA plan' });
  }
});

// Update DCA plan
app.put('/api/dca/plan', async (req, res) => {
  try {
    const { 
      annualCashflow, 
      timeHorizonYears, 
      targetAllocations, 
      holdingTargets,
      annualEmploymentIncome,
      employer401kMatch,
      employee401kPercent,
      taxableInvestmentCashflow,
      employee401kContribution,
      employer401kContribution,
      total401kCashflow
    } = req.body;
    
    const data = await readPortfolioData();
    const now = new Date().toISOString();
    
    // Initialize dcaPlan if it doesn't exist
    if (!data.dcaPlan) {
      data.dcaPlan = {
        annualCashflow: 0,
        timeHorizonYears: 1,
        targetAllocations: [],
        holdingTargets: [],
        createdDate: now,
        lastUpdated: now
      };
    }
    
    // Update only the fields that are provided
    if (annualCashflow !== undefined) {
      data.dcaPlan.annualCashflow = parseFloat(annualCashflow);
    }
    if (timeHorizonYears !== undefined) {
      data.dcaPlan.timeHorizonYears = parseInt(timeHorizonYears);
    }
    if (targetAllocations !== undefined) {
      data.dcaPlan.targetAllocations = targetAllocations;
    }
    if (holdingTargets !== undefined) {
      data.dcaPlan.holdingTargets = holdingTargets;
    }
    
    // Update new cashflow breakdown fields
    if (annualEmploymentIncome !== undefined) {
      data.dcaPlan.annualEmploymentIncome = parseFloat(annualEmploymentIncome);
    }
    if (employer401kMatch !== undefined) {
      data.dcaPlan.employer401kMatch = parseFloat(employer401kMatch);
    }
    if (employee401kPercent !== undefined) {
      data.dcaPlan.employee401kPercent = parseFloat(employee401kPercent);
    }
    if (taxableInvestmentCashflow !== undefined) {
      data.dcaPlan.taxableInvestmentCashflow = parseFloat(taxableInvestmentCashflow);
    }
    if (employee401kContribution !== undefined) {
      data.dcaPlan.employee401kContribution = parseFloat(employee401kContribution);
    }
    if (employer401kContribution !== undefined) {
      data.dcaPlan.employer401kContribution = parseFloat(employer401kContribution);
    }
    if (total401kCashflow !== undefined) {
      data.dcaPlan.total401kCashflow = parseFloat(total401kCashflow);
    }
    
    data.dcaPlan.lastUpdated = now;
    if (!data.dcaPlan.createdDate) {
      data.dcaPlan.createdDate = now;
    }

    await writePortfolioData(data);
    res.json(data.dcaPlan);
  } catch (error) {
    console.error('DCA plan update error:', error);
    res.status(500).json({ error: 'Failed to update DCA plan' });
  }
});

// Calculate DCA recommendations
app.get('/api/dca/recommendations', async (req, res) => {
  try {
    const data = await readPortfolioData();
    const dcaPlan = data.dcaPlan;
    
    if (!dcaPlan || !dcaPlan.annualCashflow || dcaPlan.annualCashflow <= 0) {
      return res.status(400).json({ error: 'DCA plan not configured. Please set annual cashflow and time horizon first.' });
    }

    // Calculate current portfolio value and allocation
    const currentPortfolioValue = data.holdings.reduce((sum, holding) => sum + holding.totalValue, 0);
    const currentAllocation = {};
    
    data.holdings.forEach(holding => {
      if (!currentAllocation[holding.assetClass]) {
        currentAllocation[holding.assetClass] = 0;
      }
      currentAllocation[holding.assetClass] += holding.totalValue;
    });

    // Calculate target portfolio value after time horizon
    const futurePortfolioValue = currentPortfolioValue + (dcaPlan.annualCashflow * dcaPlan.timeHorizonYears);
    
    // Calculate asset class gaps and DCA amounts
    const assetClassRecommendations = dcaPlan.targetAllocations.map(target => {
      const assetClass = data.assetClasses.find(ac => ac.id === target.assetClassId);
      const currentValue = currentAllocation[target.assetClassId] || 0;
      const currentPercent = currentPortfolioValue > 0 ? (currentValue / currentPortfolioValue) * 100 : 0;
      const targetValue = (target.targetPercent / 100) * futurePortfolioValue;
      const gapAmount = targetValue - currentValue;
      const totalDcaNeeded = Math.max(0, gapAmount);
      
      // Determine if this asset class includes 401k holdings
      const has401kHoldings = data.holdings.some(h => 
        h.assetClass === target.assetClassId && h.accountId && 
        data.accounts.find(acc => acc.id === h.accountId && acc.accountType === '401k')
      );
      
      // Constrain DCA for 401k investments
      let constrainedDcaNeeded = totalDcaNeeded;
      let constraint = null;
      
      if (has401kHoldings && dcaPlan.total401kCashflow) {
        // Calculate the maximum 401k DCA available over the time horizon
        const max401kDcaTotal = dcaPlan.total401kCashflow * dcaPlan.timeHorizonYears;
        
        // If the needed DCA exceeds available 401k cashflow, constrain it
        if (totalDcaNeeded > max401kDcaTotal) {
          constrainedDcaNeeded = max401kDcaTotal;
          constraint = {
            type: '401k_limit',
            message: `Limited by 401(k) annual cashflow of ${dcaPlan.total401kCashflow.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
            unconstrained: totalDcaNeeded,
            maxAvailable: max401kDcaTotal
          };
        }
      }
      
      return {
        assetClassId: target.assetClassId,
        assetClassName: assetClass?.name || target.assetClassId,
        assetClassColor: assetClass?.color || '#718096',
        currentValue,
        currentPercent,
        targetPercent: target.targetPercent,
        targetValue,
        gapAmount,
        totalDcaNeeded: constrainedDcaNeeded,
        annualDca: constrainedDcaNeeded / dcaPlan.timeHorizonYears,
        monthlyDca: constrainedDcaNeeded / (dcaPlan.timeHorizonYears * 12),
        weeklyDca: constrainedDcaNeeded / (dcaPlan.timeHorizonYears * 52),
        constraint,
        has401kHoldings
      };
    });

    // Calculate holding-level recommendations
    const holdingRecommendations = dcaPlan.holdingTargets.map(target => {
      const holding = data.holdings.find(h => h.id === target.holdingId);
      const currentValue = holding ? holding.totalValue : 0;
      const targetValue = target.targetAmount;
      const gapAmount = targetValue - currentValue;
      const totalDcaNeeded = Math.max(0, gapAmount);
      
      // Check if this holding is in a 401k account
      let is401kHolding = false;
      if (holding && holding.accountId) {
        // For existing holdings
        is401kHolding = data.accounts.find(acc => acc.id === holding.accountId && acc.accountType === '401k');
      } else if (target.isFutureHolding && target.accountId) {
        // For future holdings, check the account specified in the target
        is401kHolding = data.accounts.find(acc => acc.id === target.accountId && acc.accountType === '401k');
      }
      
      // Constrain DCA for 401k holdings
      let constrainedDcaNeeded = totalDcaNeeded;
      let constraint = null;
      
      if (is401kHolding && dcaPlan.total401kCashflow) {
        // Calculate the maximum 401k DCA available over the time horizon
        const max401kDcaTotal = dcaPlan.total401kCashflow * dcaPlan.timeHorizonYears;
        
        // If the needed DCA exceeds available 401k cashflow, constrain it
        if (totalDcaNeeded > max401kDcaTotal) {
          constrainedDcaNeeded = max401kDcaTotal;
          constraint = {
            type: '401k_limit',
            message: `Limited by 401(k) annual cashflow of ${dcaPlan.total401kCashflow.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
            unconstrained: totalDcaNeeded,
            maxAvailable: max401kDcaTotal
          };
        }
      }
      
      return {
        holdingId: target.holdingId,
        symbol: holding?.symbol || target.symbol,
        name: holding?.name || target.name,
        assetClassId: holding?.assetClass || target.assetClassId,
        currentValue,
        targetValue,
        gapAmount,
        totalDcaNeeded: constrainedDcaNeeded,
        annualDca: constrainedDcaNeeded / dcaPlan.timeHorizonYears,
        monthlyDca: constrainedDcaNeeded / (dcaPlan.timeHorizonYears * 12),
        weeklyDca: constrainedDcaNeeded / (dcaPlan.timeHorizonYears * 52),
        currentPrice: holding?.currentPrice || target.expectedPrice || 0,
        isFutureHolding: target.isFutureHolding || false,
        is401kHolding,
        constraint
      };
    });

    const recommendations = {
      summary: {
        currentPortfolioValue,
        futurePortfolioValue,
        totalCashflowNeeded: dcaPlan.annualCashflow * dcaPlan.timeHorizonYears,
        annualCashflow: dcaPlan.annualCashflow,
        monthlyCashflow: dcaPlan.annualCashflow / 12,
        weeklyCashflow: dcaPlan.annualCashflow / 52,
        timeHorizonYears: dcaPlan.timeHorizonYears
      },
      assetClasses: assetClassRecommendations,
      holdings: holdingRecommendations
    };

    res.json(recommendations);
  } catch (error) {
    console.error('DCA recommendations error:', error);
    res.status(500).json({ error: 'Failed to calculate DCA recommendations' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
async function startServer() {
  await ensureDataDirectory();
  await initializeData();
  
  app.listen(PORT, () => {
    console.log(`Portfolio Manager server running at http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
  });
}

startServer().catch(console.error);

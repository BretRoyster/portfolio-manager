// Portfolio Manager Frontend JavaScript - Asset Allocation View

class PortfolioManager {
    constructor() {
        this.apiBase = '';
        this.holdings = [];
        this.transactions = [];
        this.assetClasses = [];
        this.assetAllocation = [];
        this.accountTypes = [];
        this.accounts = [];
        this.reconciliationData = [];
        this.dcaPlan = null;
        this.dcaRecommendations = null;
        this.currentDcaTab = 'setup';
        this.currentView = 'allocation'; // 'allocation' or 'holdings'
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.setDefaultDate();
    }

    setupEventListeners() {
        // Add holding form
        document.getElementById('addHoldingForm').addEventListener('submit', this.handleAddHolding.bind(this));
        
        // Edit holding form
        document.getElementById('editHoldingForm').addEventListener('submit', this.handleEditHolding.bind(this));
        
        // Add account form
        document.getElementById('addAccountForm').addEventListener('submit', this.handleAddAccount.bind(this));
        
        // Edit account form
        const editAccountForm = document.getElementById('editAccountForm');
        if (editAccountForm) {
            editAccountForm.addEventListener('submit', this.handleEditAccount.bind(this));
        }
        
        // Modal click outside to close
        document.getElementById('addHoldingModal').addEventListener('click', (e) => {
            if (e.target.id === 'addHoldingModal') {
                this.hideAddHoldingModal();
            }
        });
        
        document.getElementById('editHoldingModal').addEventListener('click', (e) => {
            if (e.target.id === 'editHoldingModal') {
                this.hideEditHoldingModal();
            }
        });

        document.getElementById('accountsModal').addEventListener('click', (e) => {
            if (e.target.id === 'accountsModal') {
                this.hideAccountsModal();
            }
        });

        // Add event listener for edit account modal if it exists
        const editAccountModal = document.getElementById('editAccountModal');
        if (editAccountModal) {
            editAccountModal.addEventListener('click', (e) => {
                if (e.target.id === 'editAccountModal') {
                    this.hideEditAccountModal();
                }
            });
        }

        // Add event listener for reconciliation modal if it exists
        const reconciliationModal = document.getElementById('reconciliationModal');
        if (reconciliationModal) {
            reconciliationModal.addEventListener('click', (e) => {
                if (e.target.id === 'reconciliationModal') {
                    this.hideReconciliationModal();
                }
            });
        }

        // Add event listener for DCA planning modal if it exists
        const dcaPlanningModal = document.getElementById('dcaPlanningModal');
        if (dcaPlanningModal) {
            dcaPlanningModal.addEventListener('click', (e) => {
                if (e.target.id === 'dcaPlanningModal') {
                    this.hideDcaPlanningModal();
                }
            });
        }

        // Add event listener for asset classes modal if it exists
        const assetClassesModal = document.getElementById('assetClassesModal');
        if (assetClassesModal) {
            assetClassesModal.addEventListener('click', (e) => {
                if (e.target.id === 'assetClassesModal') {
                    this.hideAssetClassesModal();
                }
            });
        }

        // Add event listener for edit asset class modal if it exists
        const editAssetClassModal = document.getElementById('editAssetClassModal');
        if (editAssetClassModal) {
            editAssetClassModal.addEventListener('click', (e) => {
                if (e.target.id === 'editAssetClassModal') {
                    this.hideEditAssetClassModal();
                }
            });
        }

        // DCA setup form
        const dcaSetupForm = document.getElementById('dcaSetupForm');
        if (dcaSetupForm) {
            dcaSetupForm.addEventListener('submit', this.handleDcaSetup.bind(this));
            
            // Add real-time calculation updates
            ['annualEmploymentIncome', 'employer401kMatch', 'employee401kPercent', 'taxableInvestmentCashflow'].forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.addEventListener('input', this.updateDcaCalculations.bind(this));
                }
            });
        }

        // Asset class forms
        const addAssetClassForm = document.getElementById('addAssetClassForm');
        if (addAssetClassForm) {
            addAssetClassForm.addEventListener('submit', this.handleAddAssetClass.bind(this));
        }

        const editAssetClassForm = document.getElementById('editAssetClassForm');
        if (editAssetClassForm) {
            editAssetClassForm.addEventListener('submit', this.handleEditAssetClass.bind(this));
        }

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAddHoldingModal();
                this.hideEditHoldingModal();
                this.hideAccountsModal();
                this.hideReconciliationModal();
                this.hideDcaPlanningModal();
                this.hideAssetClassesModal();
                this.hideEditAssetClassModal();
                this.hideEditAccountModal();
            }
        });
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('purchaseDate').value = today;
    }

    // API Methods
    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiBase}/api${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            this.showNotification('Error connecting to server', 'error');
            throw error;
        }
    }

    async loadData() {
        try {
            const [holdings, summary, transactions, assetClasses, assetAllocation, accountTypes, accounts] = await Promise.all([
                this.apiCall('/holdings'),
                this.apiCall('/portfolio/summary'),
                this.apiCall('/transactions'),
                this.apiCall('/asset-classes'),
                this.apiCall('/asset-allocation'),
                this.apiCall('/account-types'),
                this.apiCall('/accounts')
            ]);

            this.holdings = holdings;
            this.transactions = transactions;
            this.assetClasses = assetClasses;
            this.assetAllocation = assetAllocation;
            this.accountTypes = accountTypes;
            this.accounts = accounts;
            
            this.renderSummary(summary);
            this.renderAssetAllocation();
            this.renderHoldings();
            this.renderTransactions();
            this.populateAssetClassOptions();
            this.populateAccountOptions();
            this.populateAccountTypeOptions();
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    // Rendering Methods
    renderSummary(summary) {
        document.getElementById('totalValue').textContent = this.formatCurrency(summary.totalValue);
        document.getElementById('totalCost').textContent = this.formatCurrency(summary.totalCost);
        document.getElementById('totalGainLoss').textContent = this.formatCurrency(summary.totalGainLoss);
        document.getElementById('assetClassesCount').textContent = this.assetAllocation.length.toString();

        const percentageElement = document.getElementById('totalGainLossPercent');
        percentageElement.textContent = this.formatPercentage(summary.totalGainLossPercent);
        percentageElement.className = `percentage ${summary.totalGainLoss >= 0 ? 'positive' : 'negative'}`;
    }

    renderAssetAllocation() {
        const grid = document.getElementById('allocationGrid');
        const emptyState = document.getElementById('allocationEmptyState');

        if (this.assetAllocation.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        
        grid.innerHTML = this.assetAllocation.map(asset => `
            <div class="asset-class-card" style="border-left-color: ${asset.color}" onclick="portfolioManager.viewAssetClassHoldings('${asset.id}')">
                <div class="asset-class-header">
                    <div class="asset-class-info">
                        <h3>${asset.name}</h3>
                        <p>${asset.description}</p>
                    </div>
                    <div class="asset-class-percentage">
                        <div class="percentage-value">${this.formatPercentage(asset.percentage)}</div>
                        <div class="percentage-label">of portfolio</div>
                    </div>
                </div>
                <div class="asset-class-metrics">
                    <div class="metric">
                        <div class="metric-value">${this.formatCurrency(asset.totalValue)}</div>
                        <div class="metric-label">Market Value</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value ${asset.gainLoss >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(asset.gainLoss)}</div>
                        <div class="metric-label">Gain/Loss</div>
                    </div>
                </div>
                <div class="asset-class-footer">
                    <div class="holdings-count">${asset.holdings.length} holding${asset.holdings.length !== 1 ? 's' : ''}</div>
                    <button class="view-holdings-btn" onclick="event.stopPropagation(); portfolioManager.viewAssetClassHoldings('${asset.id}')">
                        View Holdings
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderHoldings() {
        const tbody = document.getElementById('holdingsTableBody');
        
        tbody.innerHTML = this.holdings.map(holding => {
            const assetClass = this.assetClasses.find(ac => ac.id === holding.assetClass);
            const assetClassName = assetClass ? assetClass.name : holding.assetClass;
            const account = this.accounts.find(acc => acc.id === holding.accountId);
            const accountName = account ? account.name : 'Unknown Account';
            
            return `
                <tr>
                    <td><span class="account-badge">${accountName}</span></td>
                    <td><span class="asset-class-badge" style="background-color: ${assetClass?.color || '#718096'}">${assetClassName}</span></td>
                    <td class="symbol">${holding.symbol}</td>
                    <td>${holding.name}</td>
                    <td>${this.formatNumber(holding.shares)}</td>
                    <td>${this.formatCurrency(holding.purchasePrice)}</td>
                    <td>${this.formatCurrency(holding.currentPrice)}</td>
                    <td>${this.formatCurrency(holding.totalValue)}</td>
                    <td class="${holding.gainLoss >= 0 ? 'positive' : 'negative'}">
                        ${this.formatCurrency(holding.gainLoss)}
                    </td>
                    <td class="${holding.gainLossPercent >= 0 ? 'positive' : 'negative'}">
                        ${this.formatPercentage(holding.gainLossPercent)}
                    </td>
                    <td class="actions">
                        <button class="btn btn-secondary btn-small" onclick="portfolioManager.editHolding('${holding.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-small" onclick="portfolioManager.deleteHolding('${holding.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderTransactions() {
        const container = document.getElementById('transactionsList');
        
        if (this.transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h3>No Transactions</h3>
                    <p>Your transaction history will appear here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.transactions.slice(0, 10).map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-icon ${transaction.type}">
                        <i class="fas fa-${transaction.type === 'buy' ? 'plus' : 'minus'}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${transaction.type.toUpperCase()} ${transaction.symbol}</h4>
                        <p>${this.formatNumber(transaction.shares)} shares @ ${this.formatCurrency(transaction.price)}</p>
                    </div>
                </div>
                <div class="transaction-amount">
                    <div class="amount">${this.formatCurrency(transaction.total)}</div>
                    <div class="date">${this.formatDate(transaction.date)}</div>
                </div>
            </div>
        `).join('');
    }

    populateAssetClassOptions() {
        const select = document.getElementById('assetClass');
        select.innerHTML = '<option value="">Select asset class...</option>' + 
            this.assetClasses.map(ac => `<option value="${ac.id}">${ac.name}</option>`).join('');
    }

    populateAccountOptions() {
        const select = document.getElementById('account');
        select.innerHTML = '<option value="">Select account...</option>' + 
            this.accounts.map(acc => `<option value="${acc.id}">${acc.name}</option>`).join('');
    }

    populateAccountTypeOptions() {
        const select = document.getElementById('accountType');
        select.innerHTML = '<option value="">Select type...</option>' + 
            this.accountTypes.map(at => `<option value="${at.id}">${at.name}</option>`).join('');
    }

    // View Management
    toggleView() {
        const allocationSection = document.querySelector('.asset-allocation-section');
        const holdingsSection = document.getElementById('holdingsSection');
        const viewToggle = document.getElementById('viewToggle');

        if (this.currentView === 'allocation') {
            // Switch to holdings view
            allocationSection.style.display = 'none';
            holdingsSection.style.display = 'block';
            viewToggle.innerHTML = '<i class="fas fa-chart-pie"></i> View Asset Allocation';
            this.currentView = 'holdings';
        } else {
            // Switch to allocation view
            allocationSection.style.display = 'block';
            holdingsSection.style.display = 'none';
            viewToggle.innerHTML = '<i class="fas fa-list"></i> View Holdings';
            this.currentView = 'allocation';
        }
    }

    async viewAssetClassHoldings(assetClassId) {
        try {
            const holdings = await this.apiCall(`/holdings/by-asset-class/${assetClassId}`);
            this.showAssetClassModal(assetClassId, holdings);
        } catch (error) {
            this.showNotification('Failed to load asset class holdings', 'error');
        }
    }

    showAssetClassModal(assetClassId, holdings) {
        const assetClass = this.assetClasses.find(ac => ac.id === assetClassId);
        if (!assetClass) return;

        // Create modal HTML
        const modalHtml = `
            <div id="assetClassModal" class="modal show">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h2>${assetClass.name} Holdings</h2>
                        <button class="close-btn" onclick="portfolioManager.hideAssetClassModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="table-container">
                            <table class="holdings-table">
                                <thead>
                                    <tr>
                                        <th>Symbol</th>
                                        <th>Name</th>
                                        <th>Shares</th>
                                        <th>Purchase Price</th>
                                        <th>Current Price</th>
                                        <th>Total Value</th>
                                        <th>Gain/Loss</th>
                                        <th>%</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${holdings.map(holding => `
                                        <tr>
                                            <td class="symbol">${holding.symbol}</td>
                                            <td>${holding.name}</td>
                                            <td>${this.formatNumber(holding.shares)}</td>
                                            <td>${this.formatCurrency(holding.purchasePrice)}</td>
                                            <td>${this.formatCurrency(holding.currentPrice)}</td>
                                            <td>${this.formatCurrency(holding.totalValue)}</td>
                                            <td class="${holding.gainLoss >= 0 ? 'positive' : 'negative'}">
                                                ${this.formatCurrency(holding.gainLoss)}
                                            </td>
                                            <td class="${holding.gainLossPercent >= 0 ? 'positive' : 'negative'}">
                                                ${this.formatPercentage(holding.gainLossPercent)}
                                            </td>
                                            <td class="actions">
                                                <button class="btn btn-secondary btn-small" onclick="portfolioManager.editHolding('${holding.id}')">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-danger btn-small" onclick="portfolioManager.deleteHolding('${holding.id}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ${holdings.length === 0 ? `
                                <div class="empty-state">
                                    <i class="fas fa-folder-open"></i>
                                    <h3>No Holdings</h3>
                                    <p>No investments found in this asset class.</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('assetClassModal');
        if (existingModal) existingModal.remove();

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add click outside to close
        document.getElementById('assetClassModal').addEventListener('click', (e) => {
            if (e.target.id === 'assetClassModal') {
                this.hideAssetClassModal();
            }
        });
    }

    hideAssetClassModal() {
        const modal = document.getElementById('assetClassModal');
        if (modal) {
            modal.remove();
        }
    }

    // Modal Methods
    showAddHoldingModal() {
        document.getElementById('addHoldingModal').classList.add('show');
        document.getElementById('assetClass').focus();
    }

    hideAddHoldingModal() {
        document.getElementById('addHoldingModal').classList.remove('show');
        document.getElementById('addHoldingForm').reset();
        this.setDefaultDate();
    }

    showEditHoldingModal(holding) {
        document.getElementById('editHoldingId').value = holding.id;
        document.getElementById('editSymbol').value = holding.symbol;
        document.getElementById('editName').value = holding.name;
        document.getElementById('editShares').value = holding.shares;
        document.getElementById('editCurrentPrice').value = holding.currentPrice;
        
        document.getElementById('editHoldingModal').classList.add('show');
        document.getElementById('editShares').focus();
    }

    hideEditHoldingModal() {
        document.getElementById('editHoldingModal').classList.remove('show');
        document.getElementById('editHoldingForm').reset();
    }

    // CRUD Operations
    async handleAddHolding(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const holdingData = {
            symbol: formData.get('symbol').toUpperCase(),
            name: formData.get('name'),
            assetClass: formData.get('assetClass'),
            accountId: formData.get('accountId'),
            shares: parseFloat(formData.get('shares')),
            purchasePrice: parseFloat(formData.get('purchasePrice')),
            purchaseDate: formData.get('purchaseDate')
        };

        try {
            await this.apiCall('/holdings', {
                method: 'POST',
                body: JSON.stringify(holdingData)
            });

            this.hideAddHoldingModal();
            await this.loadData();
            this.showNotification('Investment added successfully!', 'success');
        } catch (error) {
            this.showNotification('Failed to add investment', 'error');
        }
    }

    async handleAddAccount(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const accountData = {
            name: formData.get('name'),
            accountType: formData.get('accountType'),
            provider: formData.get('provider')
        };

        try {
            await this.apiCall('/accounts', {
                method: 'POST',
                body: JSON.stringify(accountData)
            });

            this.hideAddAccountForm();
            await this.loadData();
            this.renderAccounts();
            this.showNotification('Account added successfully!', 'success');
        } catch (error) {
            this.showNotification('Failed to add account', 'error');
        }
    }

    async handleEditHolding(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const holdingId = formData.get('id') || document.getElementById('editHoldingId').value;
        const updateData = {
            name: formData.get('name'),
            shares: parseFloat(formData.get('shares')),
            currentPrice: parseFloat(formData.get('currentPrice'))
        };

        try {
            await this.apiCall(`/holdings/${holdingId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });

            this.hideEditHoldingModal();
            this.hideAssetClassModal(); // Close asset class modal if open
            await this.loadData();
            this.showNotification('Investment updated successfully!', 'success');
        } catch (error) {
            this.showNotification('Failed to update investment', 'error');
        }
    }

    async editHolding(holdingId) {
        const holding = this.holdings.find(h => h.id === holdingId);
        if (holding) {
            this.showEditHoldingModal(holding);
        }
    }

    async deleteHolding(holdingId) {
        const holding = this.holdings.find(h => h.id === holdingId);
        if (!holding) return;

        if (confirm(`Are you sure you want to delete ${holding.symbol}?`)) {
            try {
                await this.apiCall(`/holdings/${holdingId}`, {
                    method: 'DELETE'
                });

                this.hideAssetClassModal(); // Close asset class modal if open
                await this.loadData();
                this.showNotification('Investment deleted successfully!', 'success');
            } catch (error) {
                this.showNotification('Failed to delete investment', 'error');
            }
        }
    }

    async refreshPortfolio() {
        const refreshBtn = document.querySelector('[onclick="refreshPortfolio()"]');
        const originalText = refreshBtn.innerHTML;
        
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        refreshBtn.disabled = true;

        try {
            await this.loadData();
            this.showNotification('Portfolio refreshed!', 'success');
        } catch (error) {
            this.showNotification('Failed to refresh portfolio', 'error');
        } finally {
            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
        }
    }

    // Utility Methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    }

    formatNumber(number) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3
        }).format(number || 0);
    }

    formatPercentage(percentage) {
        return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format((percentage || 0) / 100);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add notification styles if not already present
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    z-index: 2000;
                    animation: slideInRight 0.3s ease, slideOutRight 0.3s ease 2.7s;
                    animation-fill-mode: both;
                }
                .notification-success { background: #38a169; }
                .notification-error { background: #e53e3e; }
                .notification-info { background: #3182ce; }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .asset-class-badge {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                    color: white;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Remove notification after animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Account Management Methods
    showAccountsModal() {
        document.getElementById('accountsModal').classList.add('show');
        this.renderAccounts();
    }

    hideAccountsModal() {
        document.getElementById('accountsModal').classList.remove('show');
        this.hideAddAccountForm();
    }

    showAddAccountForm() {
        document.getElementById('addAccountForm').style.display = 'block';
        document.getElementById('accountName').focus();
    }

    hideAddAccountForm() {
        document.getElementById('addAccountForm').style.display = 'none';
        document.getElementById('addAccountForm').reset();
    }

    renderAccounts() {
        const container = document.getElementById('accountsList');
        
        if (this.accounts.length === 0) {
            container.innerHTML = `
                <div class="accounts-empty">
                    <i class="fas fa-university"></i>
                    <h3>No Accounts</h3>
                    <p>Add your first account to start tracking investments.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.accounts.map(account => {
            const accountType = this.accountTypes.find(at => at.id === account.accountType);
            const holdingsInAccount = this.holdings.filter(h => h.accountId === account.id);
            
            return `
                <div class="account-item">
                    <div class="account-info">
                        <div class="account-icon">
                            <i class="${accountType?.icon || 'fas fa-folder'}"></i>
                        </div>
                        <div class="account-details">
                            <h4>${account.name}<span class="account-type-badge">${accountType?.name || account.accountType}</span></h4>
                            <p>${account.provider ? `${account.provider} • ` : ''}${holdingsInAccount.length} holding${holdingsInAccount.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div class="account-actions">
                        <button class="btn btn-secondary btn-small" onclick="portfolioManager.editAccount('${account.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-small" onclick="portfolioManager.deleteAccount('${account.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async deleteAccount(accountId) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account) return;

        const holdingsInAccount = this.holdings.filter(h => h.accountId === accountId);
        if (holdingsInAccount.length > 0) {
            this.showNotification(`Cannot delete account. ${holdingsInAccount.length} holdings are still in this account.`, 'error');
            return;
        }

        if (confirm(`Are you sure you want to delete "${account.name}"?`)) {
            try {
                await this.apiCall(`/accounts/${accountId}`, {
                    method: 'DELETE'
                });

                await this.loadData();
                this.renderAccounts();
                this.showNotification('Account deleted successfully!', 'success');
            } catch (error) {
                this.showNotification('Failed to delete account', 'error');
            }
        }
    }

    editAccount(accountId) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account) return;

        document.getElementById('editAccountId').value = account.id;
        document.getElementById('editAccountName').value = account.name;
        document.getElementById('editAccountProvider').value = account.provider || '';

        // Populate account type options with the current type selected
        this.populateEditAccountTypeOptions(account.accountType);

        this.showEditAccountModal();
    }

    showEditAccountModal() {
        document.getElementById('editAccountModal').classList.add('show');
        document.getElementById('editAccountName').focus();
    }

    hideEditAccountModal() {
        document.getElementById('editAccountModal').classList.remove('show');
        document.getElementById('editAccountForm').reset();
    }

    populateEditAccountTypeOptions(selectedAccountType) {
        const select = document.getElementById('editAccountType');
        select.innerHTML = '<option value="">Select type...</option>' + 
            this.accountTypes.map(at => 
                `<option value="${at.id}" ${at.id === selectedAccountType ? 'selected' : ''}>${at.name}</option>`
            ).join('');
    }

    async handleEditAccount(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const accountId = document.getElementById('editAccountId').value;
        const updateData = {
            name: formData.get('name'),
            accountType: formData.get('accountType'),
            provider: formData.get('provider')
        };

        try {
            await this.apiCall(`/accounts/${accountId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });

            this.hideEditAccountModal();
            await this.loadData();
            this.renderAccounts();
            this.showNotification('Account updated successfully!', 'success');
        } catch (error) {
            this.showNotification('Failed to update account', 'error');
        }
    }

    // Reconciliation Methods
    async loadReconciliationData() {
        try {
            this.reconciliationData = await this.apiCall('/accounts/reconciliation');
            this.renderReconciliation();
        } catch (error) {
            this.showNotification('Failed to load reconciliation data', 'error');
        }
    }

    showReconciliationModal() {
        document.getElementById('reconciliationModal').classList.add('show');
        this.loadReconciliationData();
    }

    hideReconciliationModal() {
        document.getElementById('reconciliationModal').classList.remove('show');
    }

    renderReconciliation() {
        const tbody = document.getElementById('reconciliationTableBody');
        const emptyState = document.getElementById('reconciliationEmptyState');
        
        if (this.reconciliationData.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        
        tbody.innerHTML = this.reconciliationData.map(account => {
            const varianceClass = account.variance === 0 ? 'neutral' : account.variance > 0 ? 'positive' : 'negative';
            const lastReconciled = account.lastReconciled ? 
                this.formatDate(account.lastReconciled) : 
                '<span class="text-muted">Never</span>';
            
            return `
                <tr class="reconciliation-row ${Math.abs(account.variancePercent) > 5 ? 'high-variance' : ''}">
                    <td>
                        <div class="account-info">
                            <strong>${account.name}</strong>
                            ${account.provider ? `<br><small class="text-muted">${account.provider}</small>` : ''}
                        </div>
                    </td>
                    <td><span class="account-type-badge">${account.accountType}</span></td>
                    <td class="text-center">${account.holdingsCount}</td>
                    <td class="calculated-total">${this.formatCurrency(account.calculatedTotal)}</td>
                    <td class="actual-balance">
                        <div class="balance-input-group">
                            <input type="number" 
                                   id="balance-${account.id}" 
                                   value="${account.actualTotal}" 
                                   step="1" 
                                   placeholder="0.00"
                                   class="balance-input">
                            <button class="btn btn-small btn-primary" onclick="portfolioManager.updateAccountBalance('${account.id}')">
                                <i class="fas fa-save"></i>
                            </button>
                        </div>
                    </td>
                    <td class="variance ${varianceClass}">
                        ${this.formatCurrency(account.variance)}
                    </td>
                    <td class="variance-percent ${varianceClass}">
                        ${this.formatPercentage(account.variancePercent)}
                    </td>
                    <td class="last-reconciled">${lastReconciled}</td>
                    <td class="actions">
                        <button class="btn btn-secondary btn-small" onclick="portfolioManager.viewAccountHoldings('${account.id}')" title="View Holdings">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async updateAccountBalance(accountId) {
        const balanceInput = document.getElementById(`balance-${accountId}`);
        const actualTotal = parseFloat(balanceInput.value) || 0;

        try {
            await this.apiCall(`/accounts/${accountId}/balance`, {
                method: 'PUT',
                body: JSON.stringify({ actualTotal })
            });

            await this.loadReconciliationData();
            this.showNotification('Account balance updated successfully!', 'success');
        } catch (error) {
            this.showNotification('Failed to update account balance', 'error');
        }
    }

    async viewAccountHoldings(accountId) {
        try {
            const holdings = await this.apiCall(`/holdings/by-account/${accountId}`);
            const account = this.accounts.find(a => a.id === accountId);
            this.showAccountHoldingsModal(account, holdings);
        } catch (error) {
            this.showNotification('Failed to load account holdings', 'error');
        }
    }

    showAccountHoldingsModal(account, holdings) {
        if (!account) return;

        // Create modal HTML
        const modalHtml = `
            <div id="accountHoldingsModal" class="modal show">
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h2>${account.name} Holdings</h2>
                        <button class="close-btn" onclick="portfolioManager.hideAccountHoldingsModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="account-summary">
                            <div class="summary-item">
                                <strong>Account Type:</strong> ${account.accountType}
                            </div>
                            ${account.provider ? `<div class="summary-item"><strong>Provider:</strong> ${account.provider}</div>` : ''}
                        </div>
                        <div class="table-container">
                            <table class="holdings-table">
                                <thead>
                                    <tr>
                                        <th>Asset Class</th>
                                        <th>Symbol</th>
                                        <th>Name</th>
                                        <th>Shares</th>
                                        <th>Purchase Price</th>
                                        <th>Current Price</th>
                                        <th>Total Value</th>
                                        <th>Gain/Loss</th>
                                        <th>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${holdings.map(holding => {
                                        const assetClass = this.assetClasses.find(ac => ac.id === holding.assetClass);
                                        return `
                                            <tr>
                                                <td><span class="asset-class-badge" style="background-color: ${assetClass?.color || '#718096'}">${assetClass?.name || holding.assetClass}</span></td>
                                                <td class="symbol">${holding.symbol}</td>
                                                <td>${holding.name}</td>
                                                <td>${this.formatNumber(holding.shares)}</td>
                                                <td>${this.formatCurrency(holding.purchasePrice)}</td>
                                                <td>${this.formatCurrency(holding.currentPrice)}</td>
                                                <td>${this.formatCurrency(holding.totalValue)}</td>
                                                <td class="${holding.gainLoss >= 0 ? 'positive' : 'negative'}">
                                                    ${this.formatCurrency(holding.gainLoss)}
                                                </td>
                                                <td class="${holding.gainLossPercent >= 0 ? 'positive' : 'negative'}">
                                                    ${this.formatPercentage(holding.gainLossPercent)}
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                            ${holdings.length === 0 ? `
                                <div class="empty-state">
                                    <i class="fas fa-folder-open"></i>
                                    <h3>No Holdings</h3>
                                    <p>No investments found in this account.</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('accountHoldingsModal');
        if (existingModal) existingModal.remove();

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add click outside to close
        document.getElementById('accountHoldingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'accountHoldingsModal') {
                this.hideAccountHoldingsModal();
            }
        });
    }

    hideAccountHoldingsModal() {
        const modal = document.getElementById('accountHoldingsModal');
        if (modal) {
            modal.remove();
        }
    }

    // DCA Planning Methods
    async showDcaPlanningModal() {
        document.getElementById('dcaPlanningModal').classList.add('show');
        await this.loadDcaPlan();
        this.showDcaTab('setup');
    }

    hideDcaPlanningModal() {
        document.getElementById('dcaPlanningModal').classList.remove('show');
    }

    showDcaTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.dca-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.dca-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected tab
        document.getElementById(`dca${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`).classList.add('active');
        document.querySelector(`[onclick="portfolioManager.showDcaTab('${tabName}')"]`).classList.add('active');
        
        this.currentDcaTab = tabName;

        // Load data for specific tabs
        if (tabName === 'allocations') {
            this.renderAllocationComparison();
        } else if (tabName === 'holdings') {
            this.renderHoldingTargets();
        } else if (tabName === 'schedule') {
            this.loadDcaRecommendations();
        }
    }

    async loadDcaPlan() {
        try {
            this.dcaPlan = await this.apiCall('/dca/plan');
            this.populateDcaSetupForm();
        } catch (error) {
            console.error('Failed to load DCA plan:', error);
        }
    }

    populateDcaSetupForm() {
        if (this.dcaPlan) {
            document.getElementById('annualEmploymentIncome').value = this.dcaPlan.annualEmploymentIncome || '';
            document.getElementById('employer401kMatch').value = this.dcaPlan.employer401kMatch || '';
            document.getElementById('employee401kPercent').value = this.dcaPlan.employee401kPercent || '';
            document.getElementById('taxableInvestmentCashflow').value = this.dcaPlan.taxableInvestmentCashflow || '';
            document.getElementById('timeHorizon').value = this.dcaPlan.timeHorizonYears || '';
            
            // Update calculations
            this.updateDcaCalculations();
        }
    }

    async handleDcaSetup(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const annualEmploymentIncome = parseFloat(formData.get('annualEmploymentIncome'));
        const employer401kMatch = parseFloat(formData.get('employer401kMatch'));
        const employee401kPercent = parseFloat(formData.get('employee401kPercent'));
        const taxableInvestmentCashflow = parseFloat(formData.get('taxableInvestmentCashflow'));
        
        // Calculate the total annual cashflow
        const employee401kContribution = annualEmploymentIncome * (employee401kPercent / 100);
        // Employer match is applied to employee contribution, not total income
        const employer401kContribution = employee401kContribution * (employer401kMatch / 100);
        const total401kCashflow = employee401kContribution + employer401kContribution;
        const totalAnnualCashflow = total401kCashflow + taxableInvestmentCashflow;
        
        const setupData = {
            annualEmploymentIncome,
            employer401kMatch,
            employee401kPercent,
            taxableInvestmentCashflow,
            employee401kContribution,
            employer401kContribution,
            total401kCashflow,
            annualCashflow: totalAnnualCashflow, // Keep for backward compatibility
            timeHorizonYears: parseInt(formData.get('timeHorizon'))
        };

        try {
            this.dcaPlan = await this.apiCall('/dca/plan', {
                method: 'PUT',
                body: JSON.stringify(setupData)
            });

            this.showNotification('DCA setup saved successfully!', 'success');
            this.showDcaTab('allocations');
        } catch (error) {
            this.showNotification('Failed to save DCA setup', 'error');
        }
    }

    updateDcaCalculations() {
        // Get input values
        const annualEmploymentIncome = parseFloat(document.getElementById('annualEmploymentIncome').value) || 0;
        const employer401kMatch = parseFloat(document.getElementById('employer401kMatch').value) || 0;
        const employee401kPercent = parseFloat(document.getElementById('employee401kPercent').value) || 0;
        const taxableInvestmentCashflow = parseFloat(document.getElementById('taxableInvestmentCashflow').value) || 0;
        
        // Calculate values
        const employee401kContribution = annualEmploymentIncome * (employee401kPercent / 100);
        // Employer match is applied to employee contribution, not total income
        const employer401kContribution = employee401kContribution * (employer401kMatch / 100);
        const total401kCashflow = employee401kContribution + employer401kContribution;
        const totalAnnualCashflow = total401kCashflow + taxableInvestmentCashflow;
        
        // Update display elements
        document.getElementById('calc401kEmployee').textContent = this.formatCurrency(employee401kContribution);
        document.getElementById('calc401kEmployer').textContent = this.formatCurrency(employer401kContribution);
        document.getElementById('calcTotal401k').textContent = this.formatCurrency(total401kCashflow);
        document.getElementById('calcTaxableCashflow').textContent = this.formatCurrency(taxableInvestmentCashflow);
        document.getElementById('calcTotalCashflow').textContent = this.formatCurrency(totalAnnualCashflow);
    }

    renderAllocationComparison() {
        // Render current allocation
        this.renderCurrentAllocation();
        
        // Render target allocation inputs
        this.renderTargetAllocationInputs();
    }

    renderCurrentAllocation() {
        const container = document.getElementById('currentAllocationChart');
        
        container.innerHTML = this.assetAllocation.map(asset => `
            <div class="allocation-item">
                <div class="allocation-bar">
                    <div class="allocation-fill" style="width: ${asset.percentage}%; background-color: ${asset.color}"></div>
                </div>
                <div class="allocation-details">
                    <span class="asset-name">${asset.name}</span>
                    <span class="asset-percent">${this.formatPercentage(asset.percentage)}</span>
                    <span class="asset-value">${this.formatCurrency(asset.totalValue)}</span>
                </div>
            </div>
        `).join('');
    }

    renderTargetAllocationInputs() {
        const container = document.getElementById('targetAllocationInputs');
        const existingTargets = this.dcaPlan?.targetAllocations || [];
        
        container.innerHTML = this.assetClasses.map(assetClass => {
            const existingTarget = existingTargets.find(t => t.assetClassId === assetClass.id);
            const targetPercent = existingTarget ? existingTarget.targetPercent : 0;
            
            return `
                <div class="target-allocation-input">
                    <div class="asset-info">
                        <div class="asset-color" style="background-color: ${assetClass.color}"></div>
                        <span class="asset-name">${assetClass.name}</span>
                    </div>
                    <div class="percent-input-group">
                        <input type="number" 
                               id="target-${assetClass.id}" 
                               value="${targetPercent}" 
                               step="1" 
                               min="0" 
                               max="100" 
                               class="percent-input"
                               onchange="portfolioManager.updateAllocationTotal()">
                        <span class="percent-symbol">%</span>
                    </div>
                </div>
            `;
        }).join('');
        
        this.updateAllocationTotal();
    }

    updateAllocationTotal() {
        let total = 0;
        this.assetClasses.forEach(assetClass => {
            const input = document.getElementById(`target-${assetClass.id}`);
            if (input) {
                total += parseFloat(input.value) || 0;
            }
        });
        
        document.getElementById('allocationTotal').textContent = total.toFixed(0);
        
        // Update styling based on total
        const totalElement = document.getElementById('allocationTotal');
        const container = totalElement.closest('.allocation-total');
        container.classList.remove('valid', 'invalid');
        container.classList.add(total === 100 ? 'valid' : 'invalid');
    }

    async saveTargetAllocations() {
        const targetAllocations = [];
        let total = 0;
        
        this.assetClasses.forEach(assetClass => {
            const input = document.getElementById(`target-${assetClass.id}`);
            if (input) {
                const percent = parseFloat(input.value) || 0;
                total += percent;
                if (percent > 0) {
                    targetAllocations.push({
                        assetClassId: assetClass.id,
                        targetPercent: percent
                    });
                }
            }
        });

        if (Math.abs(total - 100) > 0.1) {
            this.showNotification('Target allocations must total 100%', 'error');
            return;
        }

        try {
            // Ensure we have a base dcaPlan object
            const currentPlan = this.dcaPlan || { annualCashflow: 0, timeHorizonYears: 1 };
            
            const updateData = {
                ...currentPlan,
                targetAllocations
            };

            this.dcaPlan = await this.apiCall('/dca/plan', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });

            this.showNotification('Target allocations saved successfully!', 'success');
            this.showDcaTab('holdings');
        } catch (error) {
            console.error('Save target allocations error:', error);
            this.showNotification('Failed to save target allocations. Please complete the setup step first.', 'error');
        }
    }

    renderHoldingTargets() {
        const container = document.getElementById('holdingTargetsByAssetClass');
        const existingTargets = this.dcaPlan?.holdingTargets || [];
        
        // Group existing holdings by asset class
        const holdingsByAssetClass = {};
        this.holdings.forEach(holding => {
            if (!holdingsByAssetClass[holding.assetClass]) {
                holdingsByAssetClass[holding.assetClass] = [];
            }
            holdingsByAssetClass[holding.assetClass].push(holding);
        });

        // Group future holding targets by asset class
        const futureTargetsByAssetClass = {};
        existingTargets.filter(target => target.isFutureHolding).forEach(target => {
            if (!futureTargetsByAssetClass[target.assetClassId]) {
                futureTargetsByAssetClass[target.assetClassId] = [];
            }
            futureTargetsByAssetClass[target.assetClassId].push(target);
        });

        container.innerHTML = this.assetClasses.map(assetClass => {
            const holdings = holdingsByAssetClass[assetClass.id] || [];
            const futureTargets = futureTargetsByAssetClass[assetClass.id] || [];
            
            return `
                <div class="asset-class-targets">
                    <h4 style="color: ${assetClass.color}">
                        <i class="fas fa-circle" style="color: ${assetClass.color}"></i>
                        ${assetClass.name}
                    </h4>
                    <div class="holding-targets-list">
                        ${holdings.map(holding => {
                            const existingTarget = existingTargets.find(t => t.holdingId === holding.id && !t.isFutureHolding);
                            const targetAmount = existingTarget ? existingTarget.targetAmount : holding.totalValue;
                            
                            return `
                                <div class="holding-target-item">
                                    <div class="holding-info">
                                        <strong>${holding.symbol}</strong>
                                        <span>${holding.name}</span>
                                        <small>Current: ${this.formatCurrency(holding.totalValue)}</small>
                                    </div>
                                    <div class="target-input-group">
                                        <span>$</span>
                                        <input type="number" 
                                               id="holding-target-${holding.id}" 
                                               value="${targetAmount}" 
                                               step="1" 
                                               min="0" 
                                               class="target-amount-input"
                                               placeholder="Target amount">
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${futureTargets.map(target => {
                            const account = this.accounts.find(acc => acc.id === target.accountId);
                            const accountType = account ? this.accountTypes.find(at => at.id === account.accountType) : null;
                            const accountInfo = account ? `${account.name} (${accountType?.name || account.accountType})` : 'No account selected';
                            
                            return `
                            <div class="holding-target-item future-holding">
                                <div class="holding-info">
                                    <strong>${target.symbol} <span class="future-badge">PLANNED</span></strong>
                                    <span>${target.name}</span>
                                    <small>Account: ${accountInfo}</small>
                                    <small>Current: $0.00 (Future holding)</small>
                                </div>
                                <div class="target-input-group">
                                    <span>$</span>
                                    <input type="number" 
                                           id="holding-target-${target.holdingId}" 
                                           value="${target.targetAmount}" 
                                           step="1" 
                                           min="0" 
                                           class="target-amount-input"
                                           placeholder="Target amount">
                                    <button class="btn btn-small btn-danger" onclick="portfolioManager.removeFutureTarget('${target.holdingId}')" title="Remove">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            `;
                        }).join('')}
                        ${holdings.length === 0 && futureTargets.length === 0 ? '<p class="no-holdings">No holdings or targets in this asset class</p>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    addNewHoldingTarget() {
        this.showAddHoldingTargetModal();
    }

    showAddHoldingTargetModal() {
        // Create modal HTML for adding new holding targets
        const modalHtml = `
            <div id="addHoldingTargetModal" class="modal show">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Add New Holding Target</h2>
                        <button class="close-btn" onclick="portfolioManager.hideAddHoldingTargetModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="addHoldingTargetForm" class="modal-body">
                        <div class="form-group">
                            <label for="newTargetAccount">Account *</label>
                            <select id="newTargetAccount" name="accountId" required>
                                <option value="">Select account...</option>
                                ${this.accounts.map(acc => {
                                    const accountType = this.accountTypes.find(at => at.id === acc.accountType);
                                    return `<option value="${acc.id}">${acc.name} (${accountType?.name || acc.accountType})</option>`;
                                }).join('')}
                            </select>
                            <small class="form-help">Account where this holding will be purchased. Don't see your account? <a href="#" onclick="portfolioManager.hideAddHoldingTargetModal(); portfolioManager.showAccountsModal();">Manage accounts</a></small>
                        </div>
                        <div class="form-group">
                            <label for="newTargetAssetClass">Asset Class *</label>
                            <select id="newTargetAssetClass" name="assetClass" required>
                                <option value="">Select asset class...</option>
                                ${this.assetClasses.map(ac => `<option value="${ac.id}">${ac.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="newTargetSymbol">Symbol/Ticker *</label>
                            <input type="text" id="newTargetSymbol" name="symbol" required placeholder="e.g., AAPL, SPY, BTC">
                        </div>
                        <div class="form-group">
                            <label for="newTargetName">Name/Description</label>
                            <input type="text" id="newTargetName" name="name" placeholder="e.g., Apple Inc., S&P 500 ETF">
                        </div>
                        <div class="form-group">
                            <label for="newTargetAmount">Target Amount *</label>
                            <input type="number" id="newTargetAmount" name="targetAmount" required step="1" min="0" placeholder="10000">
                            <small class="form-help">Dollar amount you want to reach for this holding</small>
                        </div>
                        <div class="form-group">
                            <label for="newTargetPrice">Expected Price</label>
                            <input type="number" id="newTargetPrice" name="expectedPrice" step="1" min="0" placeholder="150">
                            <small class="form-help">Expected price per share (optional, for calculation purposes)</small>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="portfolioManager.hideAddHoldingTargetModal()">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-plus"></i> Add Target
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('addHoldingTargetModal');
        if (existingModal) existingModal.remove();

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add event listeners
        document.getElementById('addHoldingTargetForm').addEventListener('submit', this.handleAddHoldingTarget.bind(this));
        
        document.getElementById('addHoldingTargetModal').addEventListener('click', (e) => {
            if (e.target.id === 'addHoldingTargetModal') {
                this.hideAddHoldingTargetModal();
            }
        });

        // Focus first input
        document.getElementById('newTargetAssetClass').focus();
    }

    hideAddHoldingTargetModal() {
        const modal = document.getElementById('addHoldingTargetModal');
        if (modal) {
            modal.remove();
        }
    }

    async handleAddHoldingTarget(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const targetData = {
            holdingId: `target_${Date.now()}`, // Temporary ID for future holdings
            symbol: formData.get('symbol').toUpperCase(),
            name: formData.get('name') || formData.get('symbol').toUpperCase(),
            assetClassId: formData.get('assetClass'),
            accountId: formData.get('accountId'),
            targetAmount: parseFloat(formData.get('targetAmount')),
            expectedPrice: parseFloat(formData.get('expectedPrice')) || 0,
            isFutureHolding: true // Flag to indicate this is a planned holding
        };

        try {
            // Get current holding targets and add the new one
            const currentPlan = this.dcaPlan || { holdingTargets: [] };
            const updatedHoldingTargets = [...(currentPlan.holdingTargets || []), targetData];

            const updateData = {
                ...currentPlan,
                holdingTargets: updatedHoldingTargets
            };

            this.dcaPlan = await this.apiCall('/dca/plan', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });

            this.hideAddHoldingTargetModal();
            this.renderHoldingTargets();
            this.showNotification('Future holding target added successfully!', 'success');
        } catch (error) {
            console.error('Add holding target error:', error);
            this.showNotification('Failed to add holding target', 'error');
        }
    }

    async saveHoldingTargets() {
        const holdingTargets = [];
        
        // Save targets for existing holdings
        this.holdings.forEach(holding => {
            const input = document.getElementById(`holding-target-${holding.id}`);
            if (input) {
                const targetAmount = parseFloat(input.value) || 0;
                if (targetAmount > 0) {
                    holdingTargets.push({
                        holdingId: holding.id,
                        symbol: holding.symbol,
                        name: holding.name,
                        assetClassId: holding.assetClass,
                        targetAmount,
                        isFutureHolding: false
                    });
                }
            }
        });

        // Save targets for future holdings
        const existingTargets = this.dcaPlan?.holdingTargets || [];
        const futureTargets = existingTargets.filter(target => target.isFutureHolding);
        
        futureTargets.forEach(futureTarget => {
            const input = document.getElementById(`holding-target-${futureTarget.holdingId}`);
            if (input) {
                const targetAmount = parseFloat(input.value) || 0;
                if (targetAmount > 0) {
                    holdingTargets.push({
                        ...futureTarget,
                        targetAmount
                    });
                }
            }
        });

        try {
            // Ensure we have a base dcaPlan object
            const currentPlan = this.dcaPlan || { annualCashflow: 0, timeHorizonYears: 1 };
            
            const updateData = {
                ...currentPlan,
                holdingTargets
            };

            this.dcaPlan = await this.apiCall('/dca/plan', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });

            this.showNotification('Holding targets saved successfully!', 'success');
            this.showDcaTab('schedule');
        } catch (error) {
            console.error('Save holding targets error:', error);
            this.showNotification('Failed to save holding targets. Please complete the setup step first.', 'error');
        }
    }

    async removeFutureTarget(targetId) {
        try {
            const currentPlan = this.dcaPlan || { holdingTargets: [] };
            const updatedHoldingTargets = currentPlan.holdingTargets.filter(target => target.holdingId !== targetId);

            const updateData = {
                ...currentPlan,
                holdingTargets: updatedHoldingTargets
            };

            this.dcaPlan = await this.apiCall('/dca/plan', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });

            this.renderHoldingTargets();
            this.showNotification('Future holding target removed successfully!', 'success');
        } catch (error) {
            console.error('Remove future target error:', error);
            this.showNotification('Failed to remove future holding target', 'error');
        }
    }

    async loadDcaRecommendations() {
        try {
            this.dcaRecommendations = await this.apiCall('/dca/recommendations');
            this.renderDcaSchedule();
        } catch (error) {
            this.showNotification('Failed to load DCA recommendations. Please complete setup first.', 'error');
        }
    }

    renderDcaSchedule() {
        if (!this.dcaRecommendations) return;

        const { summary, assetClasses, holdings } = this.dcaRecommendations;

        // Update summary cards
        document.getElementById('dcaAnnualAmount').textContent = this.formatCurrency(summary.annualCashflow);
        document.getElementById('dcaMonthlyAmount').textContent = this.formatCurrency(summary.monthlyCashflow);
        document.getElementById('dcaWeeklyAmount').textContent = this.formatCurrency(summary.weeklyCashflow);
        
        // Update breakdown information if available
        if (this.dcaPlan && this.dcaPlan.total401kCashflow) {
            // Add breakdown info to the summary cards section if not already there
            this.updateCashflowBreakdown();
        }

        // Render asset class schedule
        const assetClassTBody = document.getElementById('dcaAssetClassSchedule');
        assetClassTBody.innerHTML = assetClasses.map(asset => `
            <tr class="${asset.constraint ? 'constrained-row' : ''}">
                <td>
                    <span class="asset-class-badge" style="background-color: ${asset.assetClassColor}">
                        ${asset.assetClassName}
                    </span>
                    ${asset.has401kHoldings ? '<span class="account-badge">401(k)</span>' : ''}
                </td>
                <td>${this.formatCurrency(asset.currentValue)} (${this.formatPercentage(asset.currentPercent)})</td>
                <td>${this.formatPercentage(asset.targetPercent)}</td>
                <td class="${asset.gapAmount >= 0 ? 'positive' : 'negative'}">
                    ${this.formatCurrency(asset.gapAmount)}
                </td>
                <td class="dca-amount">
                    ${this.formatCurrency(asset.annualDca)}
                    ${asset.constraint ? `<div class="constraint-warning" title="${asset.constraint.message}"><i class="fas fa-exclamation-triangle"></i></div>` : ''}
                </td>
                <td class="dca-amount">${this.formatCurrency(asset.monthlyDca)}</td>
                <td class="dca-amount">${this.formatCurrency(asset.weeklyDca)}</td>
            </tr>
        `).join('');

        // Render holding schedule
        const holdingTBody = document.getElementById('dcaHoldingSchedule');
        holdingTBody.innerHTML = holdings.map(holding => {
            const sharesPerWeek = holding.currentPrice > 0 ? holding.weeklyDca / holding.currentPrice : 0;
            const isFuture = holding.isFutureHolding;
            
            return `
                <tr class="${isFuture ? 'future-holding-row' : ''} ${holding.constraint ? 'constrained-row' : ''}">
                    <td class="symbol">
                        ${holding.symbol}
                        ${isFuture ? '<span class="future-badge">PLANNED</span>' : ''}
                        ${holding.is401kHolding ? '<span class="account-badge">401(k)</span>' : ''}
                    </td>
                    <td>
                        <span class="asset-class-badge" style="background-color: ${this.getAssetClassColor(holding.assetClassId)}">
                            ${this.getAssetClassName(holding.assetClassId)}
                        </span>
                    </td>
                    <td>${this.formatCurrency(holding.currentValue)}</td>
                    <td>${this.formatCurrency(holding.targetValue)}</td>
                    <td class="${holding.gapAmount >= 0 ? 'positive' : 'negative'}">
                        ${this.formatCurrency(holding.gapAmount)}
                    </td>
                    <td class="dca-amount">
                        ${this.formatCurrency(holding.annualDca)}
                        ${holding.constraint ? `<div class="constraint-warning" title="${holding.constraint.message}"><i class="fas fa-exclamation-triangle"></i></div>` : ''}
                    </td>
                    <td class="dca-amount">${this.formatCurrency(holding.monthlyDca)}</td>
                    <td class="dca-amount">${this.formatCurrency(holding.weeklyDca)}</td>
                    <td>
                        ${holding.currentPrice > 0 ? this.formatNumber(sharesPerWeek) + ' shares' : 'N/A'}
                        ${isFuture && holding.currentPrice === 0 ? '<br><small>Set expected price for calculation</small>' : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateCashflowBreakdown() {
        // Check if breakdown already exists
        let breakdownContainer = document.getElementById('cashflowBreakdown');
        if (!breakdownContainer) {
            // Create the breakdown container and insert it after the summary cards
            const summaryCards = document.querySelector('.dca-summary-cards');
            if (summaryCards) {
                const breakdownHtml = `
                    <div id="cashflowBreakdown" class="cashflow-breakdown">
                        <h4>Annual Cashflow Breakdown</h4>
                        <div class="breakdown-grid">
                            <div class="breakdown-item">
                                <label>401(k) Employee:</label>
                                <span id="breakdown401kEmployee">$0</span>
                            </div>
                            <div class="breakdown-item">
                                <label>401(k) Employer Match:</label>
                                <span id="breakdown401kEmployer">$0</span>
                            </div>
                            <div class="breakdown-item">
                                <label>Total 401(k):</label>
                                <span id="breakdownTotal401k">$0</span>
                            </div>
                            <div class="breakdown-item">
                                <label>Taxable Investments:</label>
                                <span id="breakdownTaxable">$0</span>
                            </div>
                        </div>
                    </div>
                `;
                summaryCards.insertAdjacentHTML('afterend', breakdownHtml);
                breakdownContainer = document.getElementById('cashflowBreakdown');
            }
        }
        
        // Update the breakdown values
        if (breakdownContainer && this.dcaPlan) {
            document.getElementById('breakdown401kEmployee').textContent = this.formatCurrency(this.dcaPlan.employee401kContribution || 0);
            document.getElementById('breakdown401kEmployer').textContent = this.formatCurrency(this.dcaPlan.employer401kContribution || 0);
            document.getElementById('breakdownTotal401k').textContent = this.formatCurrency(this.dcaPlan.total401kCashflow || 0);
            document.getElementById('breakdownTaxable').textContent = this.formatCurrency(this.dcaPlan.taxableInvestmentCashflow || 0);
        }
    }

    getAssetClassColor(assetClassId) {
        const assetClass = this.assetClasses.find(ac => ac.id === assetClassId);
        return assetClass ? assetClass.color : '#718096';
    }

    getAssetClassName(assetClassId) {
        const assetClass = this.assetClasses.find(ac => ac.id === assetClassId);
        return assetClass ? assetClass.name : assetClassId;
    }

    // Asset Class Management Methods
    showAssetClassesModal() {
        document.getElementById('assetClassesModal').classList.add('show');
        this.renderAssetClasses();
    }

    hideAssetClassesModal() {
        document.getElementById('assetClassesModal').classList.remove('show');
        this.hideAddAssetClassForm();
    }

    showAddAssetClassForm() {
        document.getElementById('addAssetClassForm').style.display = 'block';
        
        // Set a random color
        const randomColor = this.generateRandomColor();
        document.getElementById('assetClassColor').value = randomColor;
        
        document.getElementById('assetClassName').focus();
    }

    generateRandomColor() {
        // Predefined nice colors for asset classes
        const niceColors = [
            '#667eea', // Purple-blue
            '#38a169', // Green
            '#e53e3e', // Red
            '#d69e2e', // Orange
            '#9f7aea', // Purple
            '#718096', // Gray
            '#3182ce', // Blue
            '#dd6b20', // Dark orange
            '#38b2ac', // Teal
            '#805ad5', // Violet
            '#d53f8c', // Pink
            '#319795', // Cyan
            '#4299e1', // Light blue
            '#f56500', // Bright orange
            '#ed8936', // Amber
            '#48bb78', // Light green
            '#4fd1c7', // Aqua
            '#fc8181', // Light red
            '#fbb6ce', // Light pink
            '#90cdf4'  // Sky blue
        ];
        
        // Filter out colors already used by existing asset classes
        const usedColors = this.assetClasses.map(ac => ac.color.toLowerCase());
        const availableColors = niceColors.filter(color => !usedColors.includes(color.toLowerCase()));
        
        // If all predefined colors are used, generate a random hex color
        if (availableColors.length === 0) {
            const letters = '0123456789ABCDEF';
            let color = '#';
            for (let i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }
        
        // Return a random available color
        return availableColors[Math.floor(Math.random() * availableColors.length)];
    }

    hideAddAssetClassForm() {
        document.getElementById('addAssetClassForm').style.display = 'none';
        document.getElementById('addAssetClassForm').reset();
    }

    renderAssetClasses() {
        const container = document.getElementById('assetClassesList');
        const emptyState = document.getElementById('assetClassesEmptyState');
        
        if (this.assetClasses.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        container.innerHTML = this.assetClasses.map(assetClass => {
            const holdingsCount = this.holdings.filter(h => h.assetClass === assetClass.id).length;
            const assetAllocation = this.assetAllocation.find(aa => aa.id === assetClass.id);
            const totalValue = assetAllocation ? assetAllocation.totalValue : 0;
            
            return `
                <div class="asset-class-item">
                    <div class="asset-class-info">
                        <div class="asset-class-color" style="background-color: ${assetClass.color}"></div>
                        <div class="asset-class-details">
                            <h4>${assetClass.name}</h4>
                            <p>${assetClass.description || 'No description'}</p>
                            <small>${holdingsCount} holdings • ${this.formatCurrency(totalValue)}</small>
                        </div>
                    </div>
                    <div class="asset-class-actions">
                        <button class="btn btn-secondary btn-small" onclick="portfolioManager.editAssetClass('${assetClass.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-small" onclick="portfolioManager.deleteAssetClass('${assetClass.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async handleAddAssetClass(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const assetClassData = {
            name: formData.get('name'),
            description: formData.get('description'),
            color: formData.get('color')
        };

        try {
            const newAssetClass = await this.apiCall('/asset-classes', {
                method: 'POST',
                body: JSON.stringify(assetClassData)
            });

            this.hideAddAssetClassForm();
            await this.loadData(); // Refresh all data
            this.renderAssetClasses();
            this.showNotification('Asset class added successfully!', 'success');
        } catch (error) {
            this.showNotification('Failed to add asset class', 'error');
        }
    }

    editAssetClass(assetClassId) {
        const assetClass = this.assetClasses.find(ac => ac.id === assetClassId);
        if (!assetClass) return;

        document.getElementById('editAssetClassId').value = assetClass.id;
        document.getElementById('editAssetClassName').value = assetClass.name;
        document.getElementById('editAssetClassDescription').value = assetClass.description || '';
        document.getElementById('editAssetClassColor').value = assetClass.color;

        this.showEditAssetClassModal();
    }

    showEditAssetClassModal() {
        document.getElementById('editAssetClassModal').classList.add('show');
        document.getElementById('editAssetClassName').focus();
    }

    hideEditAssetClassModal() {
        document.getElementById('editAssetClassModal').classList.remove('show');
        document.getElementById('editAssetClassForm').reset();
    }

    async handleEditAssetClass(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const assetClassId = document.getElementById('editAssetClassId').value;
        const updateData = {
            name: formData.get('name'),
            description: formData.get('description'),
            color: formData.get('color')
        };

        try {
            await this.apiCall(`/asset-classes/${assetClassId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });

            this.hideEditAssetClassModal();
            await this.loadData(); // Refresh all data
            this.renderAssetClasses();
            this.showNotification('Asset class updated successfully!', 'success');
        } catch (error) {
            this.showNotification('Failed to update asset class', 'error');
        }
    }

    async deleteAssetClass(assetClassId) {
        const assetClass = this.assetClasses.find(ac => ac.id === assetClassId);
        if (!assetClass) return;

        const holdingsCount = this.holdings.filter(h => h.assetClass === assetClassId).length;
        if (holdingsCount > 0) {
            this.showNotification(`Cannot delete asset class. ${holdingsCount} holdings are using this asset class.`, 'error');
            return;
        }

        if (confirm(`Are you sure you want to delete "${assetClass.name}"?`)) {
            try {
                await this.apiCall(`/asset-classes/${assetClassId}`, {
                    method: 'DELETE'
                });

                await this.loadData(); // Refresh all data
                this.renderAssetClasses();
                this.showNotification('Asset class deleted successfully!', 'success');
            } catch (error) {
                this.showNotification('Failed to delete asset class', 'error');
            }
        }
    }
}

// Global functions for HTML onclick handlers
function showAddHoldingModal() {
    portfolioManager.showAddHoldingModal();
}

function hideAddHoldingModal() {
    portfolioManager.hideAddHoldingModal();
}

function hideEditHoldingModal() {
    portfolioManager.hideEditHoldingModal();
}

function showAccountsModal() {
    portfolioManager.showAccountsModal();
}

function hideAccountsModal() {
    portfolioManager.hideAccountsModal();
}

function showAddAccountForm() {
    portfolioManager.showAddAccountForm();
}

function hideAddAccountForm() {
    portfolioManager.hideAddAccountForm();
}

function refreshPortfolio() {
    portfolioManager.refreshPortfolio();
}

function toggleView() {
    portfolioManager.toggleView();
}

function showReconciliationModal() {
    portfolioManager.showReconciliationModal();
}

function hideReconciliationModal() {
    portfolioManager.hideReconciliationModal();
}

function showDcaPlanningModal() {
    portfolioManager.showDcaPlanningModal();
}

function hideDcaPlanningModal() {
    portfolioManager.hideDcaPlanningModal();
}

function showAssetClassesModal() {
    portfolioManager.showAssetClassesModal();
}

function hideAssetClassesModal() {
    portfolioManager.hideAssetClassesModal();
}

function showAddAssetClassForm() {
    portfolioManager.showAddAssetClassForm();
}

function hideAddAssetClassForm() {
    portfolioManager.hideAddAssetClassForm();
}

function hideEditAssetClassModal() {
    portfolioManager.hideEditAssetClassModal();
}

function hideEditAccountModal() {
    portfolioManager.hideEditAccountModal();
}

// Initialize the portfolio manager when DOM is loaded
let portfolioManager;
document.addEventListener('DOMContentLoaded', () => {
    portfolioManager = new PortfolioManager();
});
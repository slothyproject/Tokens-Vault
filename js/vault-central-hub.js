/**
 * vault-central-hub.js - Token Vault Central Command Center
 * Single dashboard to monitor and manage ALL Dissident services
 */

const VaultCentralHub = {
    // State
    services: {},
    healthData: {},
    currentTab: 'overview',
    refreshInterval: 30000, // 30 seconds
    refreshTimer: null,
    lastRefresh: null,
    
    // Initialize the hub
    init() {
        console.log('[VaultCentralHub] Initializing Central Command Center...');
        
        // Load service configurations
        this.loadServices();
        
        // Initial render
        this.render();
        
        // Start auto-refresh
        this.startAutoRefresh();
        
        // Initial health check
        this.checkAllHealth();
        
        console.log('[VaultCentralHub] Hub initialized with', Object.keys(this.services).length, 'services');
    },
    
    // Load service configurations from unified config
    loadServices() {
        if (typeof unifiedServices !== 'undefined') {
            this.services = unifiedServices.services;
        } else {
            console.error('[VaultCentralHub] unifiedServices not loaded');
            this.services = {};
        }
        
        // Initialize health data for each service
        Object.keys(this.services).forEach(serviceId => {
            this.healthData[serviceId] = {
                status: 'unknown',
                lastCheck: null,
                uptime: 0,
                responseTime: null,
                error: null
            };
        });
    },
    
    // Start auto-refresh timer
    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(() => {
            this.refreshAll();
        }, this.refreshInterval);
        
        console.log('[VaultCentralHub] Auto-refresh started (30s interval)');
    },
    
    // Stop auto-refresh
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    },
    
    // Refresh all data
    async refreshAll() {
        console.log('[VaultCentralHub] Refreshing all data...');
        this.lastRefresh = Date.now();
        
        // Check health of all services
        await this.checkAllHealth();
        
        // Re-render current tab
        this.renderTab(this.currentTab);
        
        // Update last refresh time
        this.updateLastRefreshTime();
    },
    
    // Check health of all services
    async checkAllHealth() {
        const serviceIds = Object.keys(this.services);
        
        for (const serviceId of serviceIds) {
            await this.checkServiceHealth(serviceId);
        }
    },
    
    // Check health of specific service
    async checkServiceHealth(serviceId) {
        const service = this.services[serviceId];
        if (!service || !service.healthCheck?.enabled) {
            return;
        }
        
        const healthCheck = service.healthCheck;
        const startTime = Date.now();
        
        try {
            let status = 'unknown';
            let error = null;
            
            switch (healthCheck.type) {
                case 'http':
                    status = await this.checkHttpHealth(service, healthCheck);
                    break;
                case 'railway':
                    status = await this.checkRailwayHealth(service, healthCheck);
                    break;
                default:
                    status = 'unknown';
            }
            
            const responseTime = Date.now() - startTime;
            
            this.healthData[serviceId] = {
                status,
                lastCheck: Date.now(),
                responseTime,
                uptime: this.calculateUptime(serviceId, status === 'online'),
                error
            };
            
        } catch (err) {
            this.healthData[serviceId] = {
                status: 'offline',
                lastCheck: Date.now(),
                responseTime: Date.now() - startTime,
                uptime: this.calculateUptime(serviceId, false),
                error: err.message
            };
        }
    },
    
    // HTTP health check
    async checkHttpHealth(service, healthCheck) {
        try {
            const url = service.deployUrl + (healthCheck.endpoint || '');
            const response = await fetch(url, { 
                method: 'HEAD',
                mode: 'no-cors'
            });
            
            if (healthCheck.expectedStatus) {
                return response.status === healthCheck.expectedStatus ? 'online' : 'degraded';
            }
            
            return response.ok ? 'online' : 'degraded';
        } catch (error) {
            return 'offline';
        }
    },
    
    // Railway API health check
    async checkRailwayHealth(service, healthCheck) {
        // For Railway services, we check if they're running via Railway API
        // This is a simplified check - in production you'd use Railway's API
        const vaultData = VaultCore?.loadVaultData();
        if (!vaultData?.railwayToken) {
            return 'unknown';
        }
        
        // Simulate Railway check (in production, use actual Railway API)
        // For now, assume services with Railway configs are online
        return service.railwayService ? 'online' : 'unknown';
    },
    
    // Calculate uptime percentage
    calculateUptime(serviceId, isOnline) {
        const current = this.healthData[serviceId];
        if (!current) return isOnline ? 100 : 0;
        
        // Simple uptime calculation (can be enhanced with historical data)
        const previousUptime = current.uptime || 100;
        return isOnline ? previousUptime : Math.max(0, previousUptime - 5);
    },
    
    // Get status icon
    getStatusIcon(status) {
        const icons = {
            online: '🟢',
            degraded: '🟡',
            offline: '🔴',
            unknown: '⚪'
        };
        return icons[status] || icons.unknown;
    },
    
    // Get status color
    getStatusColor(status) {
        const colors = {
            online: '#10B981',
            degraded: '#F59E0B',
            offline: '#EF4444',
            unknown: '#6B7280'
        };
        return colors[status] || colors.unknown;
    },
    
    // Aggregate variables across all services
    aggregateVariables() {
        let total = 0;
        let pending = 0;
        let errors = 0;
        
        Object.values(this.services).forEach(service => {
            if (service.variables) {
                total += service.variables.length;
                // Count pending/errors based on sync state (if available)
            }
        });
        
        return { total, pending, errors };
    },
    
    // Get online service count
    getOnlineCount() {
        return Object.values(this.healthData).filter(h => h.status === 'online').length;
    },
    
    // Get total service count
    getTotalCount() {
        return Object.keys(this.services).length;
    },
    
    // Render the hub
    render() {
        const container = document.getElementById('centralHub');
        if (!container) {
            console.error('[VaultCentralHub] centralHub container not found');
            return;
        }
        
        container.innerHTML = `
            <div class="hub-container">
                <div class="hub-header">
                    <div class="hub-title-section">
                        <h1>🎛️ Central Command Center</h1>
                        <p class="hub-subtitle">Manage all Dissident services from one place</p>
                    </div>
                    <div class="hub-actions">
                        <button class="btn-refresh" onclick="VaultCentralHub.refreshAll()" title="Refresh now">
                            🔄 Refresh
                        </button>
                        <span class="last-refresh" id="lastRefreshTime">Just now</span>
                    </div>
                </div>
                
                <div class="hub-tabs">
                    <button class="hub-tab ${this.currentTab === 'overview' ? 'active' : ''}" onclick="VaultCentralHub.switchTab('overview')">
                        📊 Overview
                    </button>
                    <button class="hub-tab ${this.currentTab === 'services' ? 'active' : ''}" onclick="VaultCentralHub.switchTab('services')">
                        ⚙️ Services (${this.getTotalCount()})
                    </button>
                    <button class="hub-tab ${this.currentTab === 'variables' ? 'active' : ''}" onclick="VaultCentralHub.switchTab('variables')">
                        🔑 Variables
                    </button>
                    <button class="hub-tab ${this.currentTab === 'health' ? 'active' : ''}" onclick="VaultCentralHub.switchTab('health')">
                        ❤️ Health
                    </button>
                    <button class="hub-tab ${this.currentTab === 'activity' ? 'active' : ''}" onclick="VaultCentralHub.switchTab('activity')">
                        📋 Activity
                    </button>
                </div>
                
                <div class="hub-content" id="hubContent">
                    ${this.renderTabContent(this.currentTab)}
                </div>
            </div>
        `;
        
        this.updateLastRefreshTime();
    },
    
    // Switch tab
    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.hub-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        event?.target?.classList.add('active');
        
        // Re-render content
        const content = document.getElementById('hubContent');
        if (content) {
            content.innerHTML = this.renderTabContent(tab);
        }
    },
    
    // Render tab content
    renderTabContent(tab) {
        switch (tab) {
            case 'overview':
                return this.renderOverviewTab();
            case 'services':
                return this.renderServicesTab();
            case 'variables':
                return this.renderVariablesTab();
            case 'health':
                return this.renderHealthTab();
            case 'activity':
                return this.renderActivityTab();
            default:
                return this.renderOverviewTab();
        }
    },
    
    // Render Overview Tab
    renderOverviewTab() {
        const onlineCount = this.getOnlineCount();
        const totalCount = this.getTotalCount();
        const vars = this.aggregateVariables();
        
        return `
            <div class="hub-overview">
                <div class="overview-grid">
                    <div class="overview-card status">
                        <div class="card-header">
                            <span class="card-icon">❤️</span>
                            <h3>System Status</h3>
                        </div>
                        <div class="card-body">
                            <div class="big-number ${onlineCount === totalCount ? 'good' : onlineCount > 0 ? 'warning' : 'bad'}">
                                ${onlineCount}/${totalCount}
                            </div>
                            <p class="card-description">Services online</p>
                            <div class="mini-list">
                                ${Object.entries(this.healthData).slice(0, 3).map(([id, data]) => {
                                    const service = this.services[id];
                                    return `<div class="mini-item">
                                        ${this.getStatusIcon(data.status)} ${service?.name || id}
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="overview-card variables">
                        <div class="card-header">
                            <span class="card-icon">🔑</span>
                            <h3>Variables</h3>
                        </div>
                        <div class="card-body">
                            <div class="big-number good">${vars.total}</div>
                            <p class="card-description">Total variables</p>
                            ${vars.pending > 0 ? `<div class="alert-badge warning">${vars.pending} pending sync</div>` : ''}
                            ${vars.errors > 0 ? `<div class="alert-badge error">${vars.errors} sync errors</div>` : ''}
                        </div>
                    </div>
                    
                    <div class="overview-card actions">
                        <div class="card-header">
                            <span class="card-icon">🚀</span>
                            <h3>Quick Actions</h3>
                        </div>
                        <div class="card-body">
                            <button class="btn-action" onclick="VaultCentralHub.syncAllVariables()">
                                🔄 Sync All Variables
                            </button>
                            <button class="btn-action" onclick="VaultCentralHub.deployAllServices()">
                                🚀 Deploy All Services
                            </button>
                            <button class="btn-action" onclick="VaultCentralHub.checkAllHealth()">
                                ❤️ Health Check All
                            </button>
                        </div>
                    </div>
                    
                    <div class="overview-card services">
                        <div class="card-header">
                            <span class="card-icon">⚙️</span>
                            <h3>Services</h3>
                        </div>
                        <div class="card-body">
                            <div class="services-grid">
                                ${Object.entries(this.services).map(([id, service]) => {
                                    const health = this.healthData[id];
                                    return `<div class="service-mini-card" onclick="VaultCentralHub.focusService('${id}')">
                                        <span class="service-icon">${service.icon}</span>
                                        <span class="service-name">${service.name}</span>
                                        <span class="service-status" style="color: ${this.getStatusColor(health?.status)}">
                                            ${this.getStatusIcon(health?.status)}
                                        </span>
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Render Services Tab
    renderServicesTab() {
        return `
            <div class="hub-services">
                <div class="services-header">
                    <input type="text" class="services-search" placeholder="🔍 Search services..." 
                           oninput="VaultCentralHub.filterServices(this.value)">
                    <div class="services-filters">
                        <button class="filter-btn" onclick="VaultCentralHub.filterByStatus('all')">All</button>
                        <button class="filter-btn" onclick="VaultCentralHub.filterByStatus('online')">Online</button>
                        <button class="filter-btn" onclick="VaultCentralHub.filterByStatus('offline')">Offline</button>
                    </div>
                </div>
                
                <div class="services-table-container">
                    <table class="services-table">
                        <thead>
                            <tr>
                                <th>Service</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Variables</th>
                                <th>Last Deploy</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="servicesTableBody">
                            ${Object.entries(this.services).map(([id, service]) => {
                                const health = this.healthData[id];
                                const varCount = service.variables?.length || 0;
                                return `
                                    <tr data-service-id="${id}" data-status="${health?.status || 'unknown'}">
                                        <td class="service-cell">
                                            <span class="service-icon">${service.icon}</span>
                                            <span class="service-name">${service.name}</span>
                                        </td>
                                        <td>${service.type}</td>
                                        <td>
                                            <span class="status-badge" style="background: ${this.getStatusColor(health?.status)}20; color: ${this.getStatusColor(health?.status)}">
                                                ${this.getStatusIcon(health?.status)} ${health?.status || 'unknown'}
                                            </span>
                                        </td>
                                        <td>${varCount} variables</td>
                                        <td>-</td>
                                        <td class="actions-cell">
                                            <button class="btn-icon" onclick="VaultCentralHub.manageService('${id}')" title="Manage">⚙️</button>
                                            <button class="btn-icon" onclick="VaultCentralHub.viewServiceLogs('${id}')" title="Logs">📋</button>
                                            <button class="btn-icon" onclick="VaultCentralHub.deployService('${id}')" title="Deploy">🚀</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },
    
    // Render Variables Tab
    renderVariablesTab() {
        const allVars = [];
        Object.entries(this.services).forEach(([serviceId, service]) => {
            if (service.variables) {
                service.variables.forEach(variable => {
                    allVars.push({
                        ...variable,
                        serviceId,
                        serviceName: service.name,
                        serviceIcon: service.icon
                    });
                });
            }
        });
        
        return `
            <div class="hub-variables">
                <div class="variables-header">
                    <input type="text" class="variables-search" placeholder="🔍 Search variables..."
                           oninput="VaultCentralHub.filterVariables(this.value)">
                    <div class="variables-stats">
                        <span>Total: ${allVars.length} variables</span>
                    </div>
                </div>
                
                <div class="variables-grid">
                    ${allVars.map(v => `
                        <div class="variable-card" data-variable="${v.key}" data-service="${v.serviceId}">
                            <div class="variable-header">
                                <span class="service-badge">${v.serviceIcon} ${v.serviceName}</span>
                                <span class="variable-key">${v.key}</span>
                                ${v.required ? '<span class="badge required">Required</span>' : ''}
                                ${v.shared ? '<span class="badge shared">Shared</span>' : ''}
                            </div>
                            <div class="variable-body">
                                <p class="variable-desc">${v.description || 'No description'}</p>
                                <div class="variable-meta">
                                    <span class="meta-item">Type: ${v.type}</span>
                                    ${v.default ? `<span class="meta-item">Default: ${v.default}</span>` : ''}
                                </div>
                            </div>
                            <div class="variable-actions">
                                <button class="btn-small" onclick="VaultCentralHub.editVariable('${v.serviceId}', '${v.key}')">
                                    Edit
                                </button>
                                ${v.shared ? `
                                    <button class="btn-small" onclick="VaultCentralHub.syncSharedVariable('${v.key}')">
                                        Sync All
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },
    
    // Render Health Tab
    renderHealthTab() {
        return `
            <div class="hub-health">
                <div class="health-summary">
                    <div class="health-metric">
                        <span class="metric-value" style="color: ${this.getOnlineCount() === this.getTotalCount() ? '#10B981' : '#F59E0B'}">
                            ${this.getOnlineCount()}/${this.getTotalCount()}
                        </span>
                        <span class="metric-label">Services Online</span>
                    </div>
                    <div class="health-metric">
                        <span class="metric-value">${this.calculateAverageUptime()}%</span>
                        <span class="metric-label">Avg Uptime</span>
                    </div>
                    <div class="health-metric">
                        <span class="metric-value">${this.calculateAverageResponseTime()}ms</span>
                        <span class="metric-label">Avg Response</span>
                    </div>
                </div>
                
                <div class="health-details">
                    ${Object.entries(this.healthData).map(([id, data]) => {
                        const service = this.services[id];
                        return `
                            <div class="health-item">
                                <div class="health-service">
                                    <span class="service-icon">${service?.icon}</span>
                                    <span class="service-name">${service?.name || id}</span>
                                    <span class="status-indicator" style="background: ${this.getStatusColor(data.status)}">
                                        ${data.status}
                                    </span>
                                </div>
                                <div class="health-stats">
                                    <div class="stat">
                                        <span class="stat-label">Uptime</span>
                                        <span class="stat-value">${data.uptime?.toFixed(1) || 0}%</span>
                                    </div>
                                    ${data.responseTime ? `
                                        <div class="stat">
                                            <span class="stat-label">Response</span>
                                            <span class="stat-value">${data.responseTime}ms</span>
                                        </div>
                                    ` : ''}
                                    <div class="stat">
                                        <span class="stat-label">Last Check</span>
                                        <span class="stat-value">${data.lastCheck ? this.formatTimeAgo(data.lastCheck) : 'Never'}</span>
                                    </div>
                                </div>
                                ${data.error ? `
                                    <div class="health-error">
                                        ⚠️ ${data.error}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },
    
    // Render Activity Tab
    renderActivityTab() {
        // Get activity from localStorage or generate sample
        const activities = this.getRecentActivity();
        
        return `
            <div class="hub-activity">
                <div class="activity-header">
                    <h3>Recent Activity</h3>
                    <button class="btn-small" onclick="VaultCentralHub.clearActivity()">Clear History</button>
                </div>
                
                <div class="activity-list">
                    ${activities.length > 0 ? activities.map(activity => `
                        <div class="activity-item ${activity.type}">
                            <span class="activity-icon">${activity.icon}</span>
                            <div class="activity-content">
                                <div class="activity-message">${activity.message}</div>
                                <div class="activity-meta">
                                    <span class="activity-service">${activity.service}</span>
                                    <span class="activity-time">${this.formatTimeAgo(activity.timestamp)}</span>
                                </div>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="activity-empty">
                            No recent activity. Start by syncing or deploying services.
                        </div>
                    `}
                </div>
            </div>
        `;
    },
    
    // Helper methods
    updateLastRefreshTime() {
        const el = document.getElementById('lastRefreshTime');
        if (el && this.lastRefresh) {
            el.textContent = this.formatTimeAgo(this.lastRefresh);
        }
    },
    
    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    },
    
    calculateAverageUptime() {
        const uptimes = Object.values(this.healthData).map(h => h.uptime || 0);
        return uptimes.length > 0 ? (uptimes.reduce((a, b) => a + b, 0) / uptimes.length).toFixed(1) : 100;
    },
    
    calculateAverageResponseTime() {
        const times = Object.values(this.healthData)
            .map(h => h.responseTime)
            .filter(t => t != null);
        return times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    },
    
    getRecentActivity() {
        const stored = localStorage.getItem('vault_hub_activity');
        if (stored) {
            try {
                return JSON.parse(stored).slice(0, 50); // Last 50 items
            } catch (e) {
                return [];
            }
        }
        return [];
    },
    
    logActivity(message, type = 'info', service = 'System', icon = '📝') {
        const activities = this.getRecentActivity();
        activities.unshift({
            message,
            type,
            service,
            icon,
            timestamp: Date.now()
        });
        
        // Keep only last 100
        if (activities.length > 100) {
            activities.pop();
        }
        
        localStorage.setItem('vault_hub_activity', JSON.stringify(activities));
        
        // Refresh if on activity tab
        if (this.currentTab === 'activity') {
            this.renderTab('activity');
        }
    },
    
    clearActivity() {
        localStorage.removeItem('vault_hub_activity');
        if (this.currentTab === 'activity') {
            this.renderTab('activity');
        }
    },
    
    // Action handlers
    async syncAllVariables() {
        this.logActivity('Starting sync for all variables', 'info', 'Hub', '🔄');
        VaultUI.showToast('Syncing all variables...', 'info');
        
        // Call unified sync
        if (typeof VaultUnifiedSync !== 'undefined') {
            const result = await VaultUnifiedSync.syncVariableToAllServices('all');
            this.logActivity(`Synced variables to ${result.summary?.success || 0} services`, 'success', 'Hub', '✅');
        }
    },
    
    async deployAllServices() {
        this.logActivity('Starting deployment for all services', 'info', 'Hub', '🚀');
        VaultUI.showToast('Deploying all services...', 'info');
        
        if (typeof VaultUnifiedSync !== 'undefined') {
            await VaultUnifiedSync.deployAllServices();
            this.logActivity('All services deployed', 'success', 'Hub', '✅');
        }
    },
    
    manageService(serviceId) {
        VaultUI.selectService(serviceId);
    },
    
    viewServiceLogs(serviceId) {
        VaultUI.viewLogs(serviceId);
    },
    
    async deployService(serviceId) {
        this.logActivity(`Deploying service ${serviceId}`, 'info', serviceId, '🚀');
        await VaultUI.deployService(serviceId);
    },
    
    focusService(serviceId) {
        this.switchTab('services');
        // Highlight the service row
        setTimeout(() => {
            const row = document.querySelector(`tr[data-service-id="${serviceId}"]`);
            if (row) {
                row.scrollIntoView({ behavior: 'smooth' });
                row.classList.add('highlighted');
                setTimeout(() => row.classList.remove('highlighted'), 2000);
            }
        }, 100);
    },
    
    editVariable(serviceId, key) {
        VaultUI.selectService(serviceId);
        // Scroll to variable
        setTimeout(() => {
            const input = document.querySelector(`[data-variable="${key}"] input`);
            if (input) {
                input.focus();
                input.select();
            }
        }, 100);
    },
    
    syncSharedVariable(key) {
        this.logActivity(`Syncing shared variable ${key}`, 'info', 'Hub', '🔄');
        if (typeof VaultUnifiedSync !== 'undefined') {
            VaultUnifiedSync.syncVariableToAllServices(key, null, { force: true });
        }
    },
    
    filterServices(query) {
        const rows = document.querySelectorAll('#servicesTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
        });
    },
    
    filterByStatus(status) {
        const rows = document.querySelectorAll('#servicesTableBody tr');
        rows.forEach(row => {
            if (status === 'all') {
                row.style.display = '';
            } else {
                const rowStatus = row.getAttribute('data-status');
                row.style.display = rowStatus === status ? '' : 'none';
            }
        });
    },
    
    filterVariables(query) {
        const cards = document.querySelectorAll('.variable-card');
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
        });
    },
    
    renderTab(tab) {
        const content = document.getElementById('hubContent');
        if (content) {
            content.innerHTML = this.renderTabContent(tab);
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('centralHub')) {
            VaultCentralHub.init();
        }
    });
} else {
    if (document.getElementById('centralHub')) {
        VaultCentralHub.init();
    }
}

// Make globally available
window.VaultCentralHub = VaultCentralHub;
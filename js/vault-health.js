/**
 * vault-health.js - Real-time Health Dashboard for Dissident Token Vault
 * Monitors all services and displays live status
 */

const VaultHealth = {
    // Configuration
    config: {
        pollIntervalActive: 30000,    // 30 seconds when tab visible
        pollIntervalBackground: 300000, // 5 minutes when tab hidden
        services: [
            { id: 'dissident-website', name: 'Dissident Website', type: 'static', url: 'https://dissident.mastertibbles.co.uk' },
            { id: 'dissident-backend', name: 'Backend API', type: 'node', url: 'https://dissident-api-backend-production.up.railway.app' },
            { id: 'discord-bot', name: 'Discord Bot', type: 'discord-bot', url: null },
            { id: 'tokens-vault', name: 'Token Vault', type: 'static', url: 'https://dissidenttokens.mastertibbles.co.uk' }
        ]
    },

    // State
    state: {
        isMonitoring: false,
        pollInterval: null,
        serviceStatus: {},
        lastUpdate: null,
        isVisible: true
    },

    // Initialize health monitoring
    init() {
        console.log('[VaultHealth] Initializing health dashboard...');
        
        // Initialize service status
        this.config.services.forEach(service => {
            this.state.serviceStatus[service.id] = {
                status: 'unknown',
                lastDeploy: null,
                lastCheck: null,
                error: null
            };
        });

        // Set up visibility change handler
        document.addEventListener('visibilitychange', () => {
            this.state.isVisible = !document.hidden;
            this.restartMonitoring();
        });

        // Initial check
        this.checkAllHealth();
        
        // Start monitoring
        this.startMonitoring();

        // Create dashboard UI
        this.createDashboard();

        console.log('[VaultHealth] Health dashboard initialized');
    },

    // Start health monitoring
    startMonitoring() {
        if (this.state.isMonitoring) return;
        
        this.state.isMonitoring = true;
        const interval = this.state.isVisible ? 
            this.config.pollIntervalActive : 
            this.config.pollIntervalBackground;

        this.state.pollInterval = setInterval(() => {
            this.checkAllHealth();
        }, interval);

        console.log(`[VaultHealth] Monitoring started (${interval}ms interval)`);
    },

    // Stop health monitoring
    stopMonitoring() {
        if (!this.state.isMonitoring) return;
        
        this.state.isMonitoring = false;
        clearInterval(this.state.pollInterval);
        console.log('[VaultHealth] Monitoring stopped');
    },

    // Restart monitoring with new interval
    restartMonitoring() {
        this.stopMonitoring();
        this.startMonitoring();
    },

    // Check health of all services
    async checkAllHealth() {
        const promises = this.config.services.map(service => 
            this.checkServiceHealth(service)
        );

        await Promise.all(promises);
        
        this.state.lastUpdate = new Date();
        this.updateDashboard();
    },

    // Check individual service health
    async checkServiceHealth(service) {
        const status = this.state.serviceStatus[service.id];
        
        try {
            if (!service.url) {
                // Bot doesn't have a URL - check via Railway API if token exists
                status.status = 'unknown';
                status.lastCheck = new Date().toISOString();
                return;
            }

            // Try to fetch service health endpoint or main URL
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(service.url, {
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // For no-cors, we can't read status, but if it didn't throw, it's likely up
            status.status = 'healthy';
            status.lastCheck = new Date().toISOString();
            status.error = null;

        } catch (error) {
            status.status = 'unhealthy';
            status.lastCheck = new Date().toISOString();
            status.error = error.message;
        }
    },

    // Create dashboard UI
    createDashboard() {
        const container = document.getElementById('healthDashboard');
        if (!container) {
            // Dashboard container doesn't exist yet - will be created by vault.html
            console.log('[VaultHealth] Dashboard container not found - will be created by vault.html');
            return;
        }

        const html = `
            <div class="health-dashboard">
                <div class="dashboard-header">
                    <h2>🖥️ Service Health</h2>
                    <div class="dashboard-controls">
                        <span class="last-update" id="healthLastUpdate">Never</span>
                        <button class="btn-icon" onclick="VaultHealth.checkAllHealth()" title="Refresh Now">
                            🔄
                        </button>
                        <button class="btn-icon" onclick="VaultHealth.toggleMonitoring()" id="monitoringToggle" title="Pause/Resume">
                            ⏸️
                        </button>
                    </div>
                </div>
                <div class="service-grid" id="serviceGrid">
                    ${this.config.services.map(service => this.createServiceCard(service)).join('')}
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    // Create service card HTML
    createServiceCard(service) {
        const status = this.state.serviceStatus[service.id];
        const statusClass = this.getStatusClass(status.status);
        const statusIcon = this.getStatusIcon(status.status);
        const lastCheck = status.lastCheck ? this.timeAgo(status.lastCheck) : 'Never';

        return `
            <div class="service-card ${statusClass}" data-service-id="${service.id}">
                <div class="service-status-indicator ${statusClass}"></div>
                <div class="service-info">
                    <h3>${service.name}</h3>
                    <span class="service-type">${service.type}</span>
                </div>
                <div class="service-status">
                    <span class="status-icon">${statusIcon}</span>
                    <span class="status-text">${this.capitalize(status.status)}</span>
                </div>
                <div class="service-meta">
                    <span class="last-check">Checked ${lastCheck}</span>
                </div>
                <div class="service-actions">
                    <button class="btn-action" onclick="VaultHealth.redeployService('${service.id}')" title="Redeploy">
                        🚀
                    </button>
                    <button class="btn-action" onclick="VaultHealth.viewLogs('${service.id}')" title="View Logs">
                        📋
                    </button>
                    ${service.url ? `
                    <button class="btn-action" onclick="window.open('${service.url}', '_blank')" title="Open Service">
                        🔗
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    // Update dashboard with current status
    updateDashboard() {
        const container = document.getElementById('healthDashboard');
        if (!container) return;

        // Update last update time
        const lastUpdateEl = document.getElementById('healthLastUpdate');
        if (lastUpdateEl && this.state.lastUpdate) {
            lastUpdateEl.textContent = `Updated ${this.timeAgo(this.state.lastUpdate)}`;
        }

        // Update service cards
        this.config.services.forEach(service => {
            const card = container.querySelector(`[data-service-id="${service.id}"]`);
            if (card) {
                const status = this.state.serviceStatus[service.id];
                const statusClass = this.getStatusClass(status.status);
                
                // Update status indicator
                const indicator = card.querySelector('.service-status-indicator');
                indicator.className = `service-status-indicator ${statusClass}`;
                
                // Update status text
                const statusIcon = card.querySelector('.status-icon');
                const statusText = card.querySelector('.status-text');
                if (statusIcon) statusIcon.textContent = this.getStatusIcon(status.status);
                if (statusText) statusText.textContent = this.capitalize(status.status);
                
                // Update last check
                const lastCheck = card.querySelector('.last-check');
                if (lastCheck) {
                    lastCheck.textContent = status.lastCheck ? 
                        `Checked ${this.timeAgo(status.lastCheck)}` : 'Never checked';
                }

                // Update card class
                card.className = `service-card ${statusClass}`;
            }
        });
    },

    // Get CSS class for status
    getStatusClass(status) {
        const classes = {
            'healthy': 'status-healthy',
            'unhealthy': 'status-unhealthy',
            'unknown': 'status-unknown',
            'checking': 'status-checking'
        };
        return classes[status] || 'status-unknown';
    },

    // Get icon for status
    getStatusIcon(status) {
        const icons = {
            'healthy': '✅',
            'unhealthy': '❌',
            'unknown': '⚪',
            'checking': '⏳'
        };
        return icons[status] || '⚪';
    },

    // Capitalize first letter
    capitalize(str) {
        if (!str) return 'Unknown';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    // Format time ago
    timeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + ' years ago';
        
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + ' months ago';
        
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + ' days ago';
        
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + ' hours ago';
        
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + ' minutes ago';
        
        return 'just now';
    },

    // Toggle monitoring on/off
    toggleMonitoring() {
        if (this.state.isMonitoring) {
            this.stopMonitoring();
            document.getElementById('monitoringToggle').textContent = '▶️';
        } else {
            this.startMonitoring();
            document.getElementById('monitoringToggle').textContent = '⏸️';
        }
    },

    // Redeploy service
    async redeployService(serviceId) {
        const vaultData = VaultCore.loadVaultData();
        if (!vaultData || !vaultData.railwayToken) {
            VaultUI.showToast('Railway token not configured', 'error');
            return;
        }

        const confirmed = confirm(`Redeploy ${serviceId}?`);
        if (!confirmed) return;

        VaultUI.showToast(`Redeploying ${serviceId}...`, 'info');

        try {
            // Use existing Railway API if available
            if (typeof RailwayAPI !== 'undefined') {
                const api = new RailwayAPI(vaultData.railwayToken);
                const service = this.config.services.find(s => s.id === serviceId);
                if (service) {
                    await api.deployService(service.railwayService || serviceId);
                    VaultUI.showToast(`${serviceId} redeployed successfully`, 'success');
                    this.checkAllHealth();
                }
            } else {
                VaultUI.showToast('Railway API not available', 'error');
            }
        } catch (error) {
            console.error('[VaultHealth] Redeploy failed:', error);
            VaultUI.showToast(`Redeploy failed: ${error.message}`, 'error');
        }
    },

    // View service logs
    async viewLogs(serviceId) {
        const vaultData = VaultCore.loadVaultData();
        if (!vaultData || !vaultData.railwayToken) {
            VaultUI.showToast('Railway token not configured', 'error');
            return;
        }

        const service = this.config.services.find(s => s.id === serviceId);
        if (!service) return;

        // Open Railway dashboard for logs
        const railwayUrl = `https://railway.app/project/resplendent-fulfillment/service/${service.railwayService || serviceId}/logs`;
        window.open(railwayUrl, '_blank');
    },

    // Get current status summary
    getStatusSummary() {
        const statuses = Object.values(this.state.serviceStatus);
        const healthy = statuses.filter(s => s.status === 'healthy').length;
        const unhealthy = statuses.filter(s => s.status === 'unhealthy').length;
        const unknown = statuses.filter(s => s.status === 'unknown').length;

        return {
            total: statuses.length,
            healthy,
            unhealthy,
            unknown,
            isAllHealthy: healthy === statuses.length
        };
    }
};

// Make available globally
window.VaultHealth = VaultHealth;

// Auto-initialize if vault.html is loaded
if (document.getElementById('serviceList')) {
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize after VaultUI
        setTimeout(() => VaultHealth.init(), 100);
    });
}

/**
 * vault-unified-sync.js - Unified Service Synchronization
 * One place to manage variables, deploy to all services automatically
 */

const VaultUnifiedSync = {
    // Service registry
    services: {},
    
    // Sync state
    syncState: {},
    
    // Initialize
    init() {
        console.log('[VaultUnifiedSync] Unified sync initialized');
        this.loadServiceConfig();
        this.loadSyncState();
    },
    
    // Load unified service configuration
    loadServiceConfig() {
        fetch('config/unified-services.yaml')
            .then(response => response.text())
            .then(yaml => {
                // Parse YAML (simplified - in production use js-yaml)
                this.services = this.parseServicesYaml(yaml);
                console.log('[VaultUnifiedSync] Loaded', Object.keys(this.services).length, 'services');
            })
            .catch(err => {
                console.error('[VaultUnifiedSync] Failed to load config:', err);
                // Fallback to local config
                this.loadLocalServices();
            });
    },
    
    // Parse services YAML
    parseServicesYaml(yaml) {
        // Simplified YAML parser for services
        // In production, include js-yaml library
        const services = {};
        
        // Extract service definitions
        const serviceMatches = yaml.match(/- id: ([\w-]+)/g);
        if (serviceMatches) {
            serviceMatches.forEach(match => {
                const id = match.replace('- id: ', '');
                services[id] = { id, variables: {} };
            });
        }
        
        return services;
    },
    
    // Load from local storage as fallback
    loadLocalServices() {
        const services = localStorage.getItem('vault_unified_services');
        if (services) {
            try {
                this.services = JSON.parse(services);
            } catch (e) {
                console.error('[VaultUnifiedSync] Failed to parse local services:', e);
            }
        }
    },
    
    // Load sync state
    loadSyncState() {
        const state = localStorage.getItem('vault_sync_state');
        if (state) {
            try {
                this.syncState = JSON.parse(state);
            } catch (e) {
                this.syncState = {};
            }
        }
    },
    
    // Save sync state
    saveSyncState() {
        localStorage.setItem('vault_sync_state', JSON.stringify(this.syncState));
    },
    
    // ============================================
    // UNIFIED VARIABLE SYNC
    // ============================================
    
    // Sync variable to ALL services that need it
    async syncVariableToAllServices(key, value, options = {}) {
        const vaultData = VaultCore.loadVaultData();
        if (!vaultData?.railwayToken) {
            VaultUI.showToast('Railway token not configured', 'error');
            return { success: false, error: 'No Railway token' };
        }
        
        // Find which services use this variable
        const targetServices = this.findServicesForVariable(key);
        
        if (targetServices.length === 0) {
            VaultUI.showToast(`No services configured for ${key}`, 'warning');
            return { success: true, services: [] };
        }
        
        console.log(`[VaultUnifiedSync] Syncing ${key} to`, targetServices.length, 'services');
        
        const results = [];
        let successCount = 0;
        let failCount = 0;
        
        for (const serviceId of targetServices) {
            const result = await this.syncToService(serviceId, key, value, vaultData.railwayToken);
            results.push(result);
            
            if (result.success) {
                successCount++;
            } else {
                failCount++;
            }
            
            // Show progress
            VaultUI.showToast(`Syncing ${key}: ${successCount}/${targetServices.length} services`, 'info');
        }
        
        // Final summary
        if (failCount === 0) {
            VaultUI.showToast(`✓ ${key} synced to all ${successCount} services`, 'success');
        } else {
            VaultUI.showToast(`Synced: ${successCount}, Failed: ${failCount}`, 'warning');
        }
        
        return {
            success: failCount === 0,
            services: results,
            summary: { success: successCount, failed: failCount }
        };
    },
    
    // Find which services use a variable
    findServicesForVariable(key) {
        const services = [];
        
        // Check unified config
        Object.entries(this.services).forEach(([serviceId, service]) => {
            if (service.variables && service.variables[key]) {
                services.push(serviceId);
            }
        });
        
        // Also check if it's a shared variable
        const sharedServices = this.getSharedVariableServices(key);
        sharedServices.forEach(s => {
            if (!services.includes(s)) {
                services.push(s);
            }
        });
        
        return services;
    },
    
    // Get services that share a variable
    getSharedVariableServices(key) {
        // This would come from unified-services.yaml
        const shared = {
            'DISCORD_TOKEN': ['dissident-bot', 'dissident-api-backend'],
            'DISCORD_CLIENT_ID': ['dissident-bot', 'dissident-api-backend', 'dissident-website'],
            'DATABASE_URL': ['dissident-bot', 'dissident-api-backend']
        };
        
        return shared[key] || [];
    },
    
    // Sync variable to a specific service
    async syncToService(serviceId, key, value, token) {
        console.log(`[VaultUnifiedSync] Syncing ${key} to ${serviceId}`);
        
        // Update sync state
        this.setSyncState(serviceId, key, 'syncing');
        
        try {
            // Use existing Railway sync
            if (typeof VaultRailwaySync !== 'undefined') {
                const result = await VaultRailwaySync.pushVariable(serviceId, key, value);
                
                if (result.success) {
                    this.setSyncState(serviceId, key, 'synced', {
                        lastSynced: Date.now(),
                        value: value
                    });
                    
                    return { serviceId, key, success: true };
                } else {
                    this.setSyncState(serviceId, key, 'failed', { error: result.error });
                    return { serviceId, key, success: false, error: result.error };
                }
            } else {
                // Fallback: store locally and mark pending
                this.setSyncState(serviceId, key, 'pending', { value });
                return { serviceId, key, success: true, pending: true };
            }
        } catch (error) {
            console.error(`[VaultUnifiedSync] Failed to sync ${key} to ${serviceId}:`, error);
            this.setSyncState(serviceId, key, 'failed', { error: error.message });
            return { serviceId, key, success: false, error: error.message };
        }
    },
    
    // Set sync state for a service-variable pair
    setSyncState(serviceId, key, status, data = {}) {
        if (!this.syncState[serviceId]) {
            this.syncState[serviceId] = {};
        }
        
        this.syncState[serviceId][key] = {
            status,
            timestamp: Date.now(),
            ...data
        };
        
        this.saveSyncState();
        this.updateUI(serviceId, key, status);
    },
    
    // Update UI with sync status
    updateUI(serviceId, key, status) {
        // Find the variable card
        const card = document.querySelector(`[data-service-id="${serviceId}"][data-variable="${key}"]`);
        if (!card) return;
        
        // Add status indicator
        let indicator = card.querySelector('.unified-sync-status');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'unified-sync-status';
            card.querySelector('.variable-header')?.appendChild(indicator);
        }
        
        const icons = {
            synced: '✅',
            syncing: '🔄',
            pending: '⏳',
            failed: '❌'
        };
        
        indicator.textContent = icons[status] || '❓';
        indicator.title = `Sync status: ${status}`;
    },
    
    // ============================================
    // UNIFIED DEPLOYMENT
    // ============================================
    
    // Deploy ALL services with latest variables
    async deployAllServices(options = {}) {
        const vaultData = VaultCore.loadVaultData();
        if (!vaultData?.railwayToken) {
            VaultUI.showToast('Railway token required', 'error');
            return;
        }
        
        const services = Object.keys(this.services);
        
        VaultUI.showToast(`Deploying ${services.length} services...`, 'info');
        
        const results = [];
        
        for (const serviceId of services) {
            const result = await this.deployService(serviceId, vaultData.railwayToken, options);
            results.push(result);
        }
        
        // Show summary modal
        this.showDeploySummary(results);
        
        return results;
    },
    
    // Deploy a single service
    async deployService(serviceId, token, options = {}) {
        console.log(`[VaultUnifiedSync] Deploying ${serviceId}`);
        
        try {
            if (typeof VaultRailwayDeploy !== 'undefined') {
                const result = await VaultRailwayDeploy.deployService(serviceId, options);
                return { serviceId, success: result.success, deploymentId: result.deploymentId };
            } else {
                return { serviceId, success: false, error: 'Deployment module not loaded' };
            }
        } catch (error) {
            console.error(`[VaultUnifiedSync] Failed to deploy ${serviceId}:`, error);
            return { serviceId, success: false, error: error.message };
        }
    },
    
    // Show deployment summary
    showDeploySummary(results) {
        const success = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        const html = `
            <div class="modal" id="deploySummaryModal">
                <div class="modal-overlay" onclick="VaultUnifiedSync.closeDeploySummary()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>🚀 Deployment Summary</h2>
                        <button class="btn-close" onclick="VaultUnifiedSync.closeDeploySummary()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="deploy-stats">
                            <div class="stat success">✅ ${success} Successful</div>
                            <div class="stat failed">❌ ${failed} Failed</div>
                        </div>
                        <div class="deploy-details">
                            ${results.map(r => `
                                <div class="deploy-item ${r.success ? 'success' : 'failed'}">
                                    <span class="service-name">${r.serviceId}</span>
                                    <span class="status">${r.success ? '✓' : '✗'}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
    },
    
    closeDeploySummary() {
        const modal = document.getElementById('deploySummaryModal');
        if (modal) modal.remove();
    },
    
    // ============================================
    // SERVICE STATUS DASHBOARD
    // ============================================
    
    // Get status of all services
    async getAllServiceStatus() {
        const statuses = {};
        
        for (const [serviceId, service] of Object.entries(this.services)) {
            statuses[serviceId] = await this.getServiceStatus(serviceId);
        }
        
        return statuses;
    },
    
    // Get status of specific service
    async getServiceStatus(serviceId) {
        const service = this.services[serviceId];
        if (!service) return null;
        
        // Check if deployed on Railway
        const railwayStatus = await this.checkRailwayStatus(serviceId);
        
        // Check sync status
        const syncStatus = this.syncState[serviceId] || {};
        const pendingVars = Object.entries(syncStatus)
            .filter(([_, status]) => status.status === 'pending')
            .map(([key, _]) => key);
        
        return {
            serviceId,
            name: service.name,
            railway: railwayStatus,
            pendingVariables: pendingVars,
            lastSync: this.getLastSyncTime(serviceId)
        };
    },
    
    // Check Railway deployment status
    async checkRailwayStatus(serviceId) {
        // Would call Railway API
        return { status: 'unknown', url: null };
    },
    
    // Get last sync time for service
    getLastSyncTime(serviceId) {
        const states = this.syncState[serviceId];
        if (!states) return null;
        
        const times = Object.values(states)
            .map(s => s.timestamp)
            .filter(t => t);
        
        return times.length > 0 ? Math.max(...times) : null;
    }
};

// Initialize
window.VaultUnifiedSync = VaultUnifiedSync;

// Auto-initialize
if (document.getElementById('serviceList')) {
    document.addEventListener('DOMContentLoaded', () => {
        VaultUnifiedSync.init();
    });
}
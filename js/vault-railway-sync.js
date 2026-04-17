/**
 * vault-railway-sync.js - Bi-directional Railway synchronization
 * Pull variables FROM Railway, detect drift, resolve conflicts
 */

const VaultRailwaySync = {
    // State
    state: {
        isChecking: false,
        lastCheck: null,
        driftDetected: {},
        serviceStatus: {}
    },

    // Initialize
    init() {
        console.log('[VaultRailwaySync] Bi-directional sync initialized');
        
        // Check for drift on load (if token available)
        const vaultData = VaultCore.loadVaultData();
        if (vaultData?.railwayToken) {
            this.checkAllDrift();
        }
    },

    // Get Railway API instance
    getRailwayAPI() {
        const vaultData = VaultCore.loadVaultData();
        if (!vaultData?.railwayToken) {
            return null;
        }
        
        // Use existing RailwayAPI class if available
        if (typeof RailwayAPI !== 'undefined') {
            return new RailwayAPI(vaultData.railwayToken);
        }
        
        return null;
    },

    // Pull variables from Railway
    async pullFromRailway(serviceId) {
        console.log(`[VaultRailwaySync] Pulling from Railway: ${serviceId}`);
        
        const api = this.getRailwayAPI();
        if (!api) {
            throw new Error('Railway token not configured');
        }

        const service = this.getServiceConfig(serviceId);
        if (!service || !service.railwayService) {
            throw new Error('Service not configured for Railway');
        }

        try {
            // Get service details from Railway
            const railwayService = await api.getService(service.railwayService);
            if (!railwayService) {
                throw new Error('Service not found in Railway');
            }

            // Get variables from Railway
            // Note: This requires additional GraphQL query - may need to extend RailwayAPI
            const railwayVariables = await this.fetchServiceVariables(api, railwayService.id);
            
            // Get local variables
            const vaultData = VaultCore.loadVaultData();
            const localVariables = vaultData.services[serviceId] || {};

            // Compare and show diff
            const diff = this.compareVariables(localVariables, railwayVariables);
            
            if (diff.hasChanges) {
                this.showPullModal(serviceId, service.name, diff, railwayVariables);
            } else {
                VaultUI.showToast('No changes to pull from Railway', 'info');
            }

            return { success: true, diff };

        } catch (error) {
            console.error('[VaultRailwaySync] Pull failed:', error);
            throw error;
        }
    },

    // Fetch service variables from Railway
    async fetchServiceVariables(api, serviceId) {
        // This is a placeholder - actual implementation depends on RailwayAPI methods
        // You may need to extend your existing RailwayAPI class with this query
        const query = `
            query GetServiceVariables($serviceId: String!) {
                service(id: $serviceId) {
                    id
                    name
                    variables {
                        edges {
                            node {
                                id
                                name
                                value
                            }
                        }
                    }
                }
            }
        `;

        try {
            const result = await api.execute(query, { serviceId });
            const variables = {};
            
            if (result.service?.variables?.edges) {
                result.service.variables.edges.forEach(edge => {
                    variables[edge.node.name] = edge.node.value;
                });
            }
            
            return variables;
        } catch (error) {
            console.error('[VaultRailwaySync] Failed to fetch variables:', error);
            return {};
        }
    },

    // Compare local vs Railway variables
    compareVariables(local, railway) {
        const added = [];      // In Railway, not in local
        const removed = [];    // In local, not in Railway
        const modified = [];   // Different values
        const unchanged = []; // Same values

        // Check Railway variables
        Object.entries(railway).forEach(([key, value]) => {
            if (!(key in local)) {
                added.push({ key, value });
            } else if (local[key] !== value) {
                modified.push({ 
                    key, 
                    localValue: local[key], 
                    railwayValue: value 
                });
            } else {
                unchanged.push({ key, value });
            }
        });

        // Check local variables not in Railway
        Object.keys(local).forEach(key => {
            if (!(key in railway)) {
                removed.push({ key, value: local[key] });
            }
        });

        return {
            hasChanges: added.length > 0 || removed.length > 0 || modified.length > 0,
            added,
            removed,
            modified,
            unchanged,
            summary: `${added.length} added, ${removed.length} removed, ${modified.length} modified`
        };
    },

    // Show pull modal with diff
    showPullModal(serviceId, serviceName, diff, railwayVariables) {
        // Create modal HTML
        const modalHtml = `
            <div id="pullModal" class="modal">
                <div class="modal-overlay" onclick="VaultRailwaySync.closePullModal()"></div>
                <div class="modal-content sync-modal">
                    <div class="modal-header">
                        <h2>🔄 Pull from Railway: ${serviceName}</h2>
                        <button class="btn-close" onclick="VaultRailwaySync.closePullModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="sync-summary">
                            ${diff.added.length > 0 ? `
                                <div class="sync-section added">
                                    <h3>➕ Added (${diff.added.length})</h3>
                                    ${diff.added.map(v => `
                                        <div class="sync-item">
                                            <label>${v.key}</label>
                                            <span class="value-new">${this.maskValue(v.value)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            ${diff.removed.length > 0 ? `
                                <div class="sync-section removed">
                                    <h3>🗑️ Removed (${diff.removed.length})</h3>
                                    ${diff.removed.map(v => `
                                        <div class="sync-item">
                                            <label>${v.key}</label>
                                            <span class="value-old">${this.maskValue(v.value)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            ${diff.modified.length > 0 ? `
                                <div class="sync-section modified">
                                    <h3>✏️ Modified (${diff.modified.length})</h3>
                                    ${diff.modified.map(v => `
                                        <div class="sync-item">
                                            <label>${v.key}</label>
                                            <div class="diff-values">
                                                <span class="value-old">${this.maskValue(v.localValue)}</span>
                                                <span class="diff-arrow">→</span>
                                                <span class="value-new">${this.maskValue(v.railwayValue)}</span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="VaultRailwaySync.closePullModal()">Cancel</button>
                        <button class="btn-primary" onclick="VaultRailwaySync.applyPull('${serviceId}', ${JSON.stringify(railwayVariables).replace(/"/g, '&quot;')})">
                            Apply Changes
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Insert modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    // Close pull modal
    closePullModal() {
        const modal = document.getElementById('pullModal');
        if (modal) modal.remove();
    },

    // Apply pulled changes
    async applyPull(serviceId, railwayVariables) {
        try {
            const vaultData = VaultCore.loadVaultData();
            
            // Update service variables
            vaultData.services[serviceId] = railwayVariables;
            
            // Save vault
            VaultCore.saveVaultData(vaultData);
            
            // Close modal
            this.closePullModal();
            
            // Refresh UI
            VaultUI.selectService(serviceId);
            VaultUI.renderServices();
            
            // Send notification
            if (typeof VaultDiscord !== 'undefined') {
                VaultDiscord.syncCompleted(serviceId, Object.keys(railwayVariables).length);
            }
            
            VaultUI.showToast('Successfully pulled from Railway', 'success');
            
        } catch (error) {
            console.error('[VaultRailwaySync] Apply failed:', error);
            VaultUI.showToast('Failed to apply changes: ' + error.message, 'error');
        }
    },

    // Check for drift (background check)
    async checkAllDrift() {
        if (this.state.isChecking) return;
        
        const vaultData = VaultCore.loadVaultData();
        if (!vaultData?.services) return;

        this.state.isChecking = true;
        console.log('[VaultRailwaySync] Checking for drift...');

        const api = this.getRailwayAPI();
        if (!api) {
            this.state.isChecking = false;
            return;
        }

        const serviceIds = Object.keys(vaultData.services);
        
        for (const serviceId of serviceIds) {
            const service = this.getServiceConfig(serviceId);
            if (!service?.railwayService) continue;

            try {
                const railwayVars = await this.fetchServiceVariables(api, service.railwayService);
                const localVars = vaultData.services[serviceId] || {};
                const diff = this.compareVariables(localVars, railwayVars);
                
                this.state.driftDetected[serviceId] = diff.hasChanges;
                
                if (diff.hasChanges) {
                    console.log(`[VaultRailwaySync] Drift detected in ${serviceId}:`, diff.summary);
                    
                    // Show drift indicator in UI
                    this.updateDriftIndicator(serviceId, true, diff);
                    
                    // Send Discord notification
                    if (typeof VaultDiscord !== 'undefined') {
                        VaultDiscord.driftDetected(serviceId, diff.added.length + diff.removed.length + diff.modified.length);
                    }
                } else {
                    this.updateDriftIndicator(serviceId, false);
                }
            } catch (error) {
                console.error(`[VaultRailwaySync] Failed to check ${serviceId}:`, error);
            }
        }

        this.state.lastCheck = new Date();
        this.state.isChecking = false;
    },

    // Update drift indicator in UI
    updateDriftIndicator(serviceId, hasDrift, diff = null) {
        // Find service button
        const serviceBtn = document.querySelector(`[data-service-id="${serviceId}"]`);
        if (!serviceBtn) return;

        // Remove existing indicator
        const existing = serviceBtn.querySelector('.drift-indicator');
        if (existing) existing.remove();

        if (hasDrift) {
            const indicator = document.createElement('span');
            indicator.className = 'drift-indicator';
            indicator.title = `Drift detected: ${diff?.summary || 'Changes found'}`;
            indicator.textContent = '⚡';
            serviceBtn.appendChild(indicator);
        }
    },

    // Get service config from vault-services.json
    getServiceConfig(serviceId) {
        if (typeof VaultUI !== 'undefined' && VaultUI.servicesConfig) {
            return VaultUI.servicesConfig.services.find(s => s.id === serviceId);
        }
        return null;
    },

    // Mask sensitive values for display
    maskValue(value) {
        if (!value) return 'Empty';
        if (value.length <= 8) return '••••';
        return value.substring(0, 4) + '••••' + value.substring(value.length - 4);
    },

    // Show sync conflict resolution modal
    showConflictModal(serviceId, conflicts) {
        // For manual conflict resolution
        // Implementation similar to showPullModal
        console.log('[VaultRailwaySync] Conflict modal:', conflicts);
    }
};

// Make available globally
window.VaultRailwaySync = VaultRailwaySync;

// Auto-initialize
if (document.getElementById('serviceList')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => VaultRailwaySync.init(), 500);
    });
}
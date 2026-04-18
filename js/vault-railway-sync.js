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
    },

    // ============================================
    // INSTANT VARIABLE PUSH (Phase 1.1)
    // ============================================

    // Push a single variable to Railway immediately
    async pushVariable(serviceId, key, value) {
        console.log(`[VaultRailwaySync] Pushing ${key} to ${serviceId}`);

        const vaultData = VaultCore.loadVaultData();
        if (!vaultData?.railwayToken) {
            return { success: false, error: 'Railway token not configured' };
        }

        const service = this.getServiceConfig(serviceId);
        if (!service?.railwayService) {
            return { success: false, error: 'Service not configured for Railway' };
        }

        // Set initial sync status
        this.setVariableSyncStatus(serviceId, key, 'syncing');

        try {
            // Step 1: Check for conflicts before pushing
            const conflict = await this.checkVariableConflict(serviceId, key, value);
            if (conflict.hasConflict) {
                this.setVariableSyncStatus(serviceId, key, 'conflict', conflict);
                return { 
                    success: false, 
                    error: 'Conflict detected',
                    conflict: conflict 
                };
            }

            // Step 2: Push to Railway
            const result = await this.pushToRailway(serviceId, key, value, vaultData.railwayToken);

            if (result.success) {
                // Step 3: Update sync metadata
                this.setVariableSyncStatus(serviceId, key, 'synced', {
                    lastSyncedAt: Date.now(),
                    railwayValue: value,
                    deploymentId: result.deploymentId
                });

                // Step 4: Trigger deployment if needed
                if (result.requiresDeploy) {
                    this.triggerDeployment(serviceId);
                }

                return { success: true, deploymentId: result.deploymentId };
            } else {
                this.setVariableSyncStatus(serviceId, key, 'failed', { error: result.error });
                return { success: false, error: result.error };
            }

        } catch (error) {
            console.error(`[VaultRailwaySync] Push failed:`, error);
            this.setVariableSyncStatus(serviceId, key, 'failed', { error: error.message });
            return { success: false, error: error.message };
        }
    },

    // Check if Railway has a different value than what we last saw
    async checkVariableConflict(serviceId, key, localValue) {
        const vaultData = VaultCore.loadVaultData();
        const metadata = this.getVariableSyncMetadata(serviceId, key);
        
        // If we've never synced this variable, no conflict possible
        if (!metadata?.lastSyncedAt) {
            return { hasConflict: false };
        }

        try {
            // Fetch current value from Railway
            const railwayValue = await this.fetchSingleVariable(
                serviceId, 
                key, 
                vaultData.railwayToken
            );

            // Conflict if Railway value changed since our last sync
            const railwayChanged = railwayValue !== metadata.railwayValue;
            const localChanged = localValue !== metadata.localValue;

            if (railwayChanged && localChanged) {
                return {
                    hasConflict: true,
                    railwayValue,
                    localValue,
                    lastSyncedValue: metadata.railwayValue,
                    message: `Both you and Railway have changed this variable`
                };
            }

            if (railwayChanged && !localChanged) {
                // Railway changed, we haven't - just update our metadata
                this.setVariableSyncStatus(serviceId, key, 'synced', {
                    lastSyncedAt: Date.now(),
                    railwayValue: railwayValue,
                    localValue: railwayValue
                });
                return { hasConflict: false, updated: true };
            }

            return { hasConflict: false };

        } catch (error) {
            console.error(`[VaultRailwaySync] Conflict check failed:`, error);
            // Fail safe: assume no conflict if we can't check
            return { hasConflict: false, checkFailed: true };
        }
    },

    // Push variable to Railway API
    async pushToRailway(serviceId, key, value, token) {
        const service = this.getServiceConfig(serviceId);
        
        const query = `
            mutation variableUpsert($input: VariableInput!) {
                variableUpsert(input: $input) {
                    id
                    name
                    value
                }
            }
        `;

        const variables = {
            input: {
                projectId: service.railwayProject,
                serviceId: service.railwayService,
                variables: {
                    [key]: value
                }
            }
        };

        try {
            const response = await fetch('https://backboard.railway.app/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query, variables })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`HTTP ${response.status}: ${error}`);
            }

            const data = await response.json();

            if (data.errors) {
                throw new Error(data.errors[0].message);
            }

            // Check if deployment is needed
            const requiresDeploy = true; // Always trigger deploy for variable changes

            return {
                success: true,
                requiresDeploy,
                deploymentId: data.data?.variableUpsert?.id
            };

        } catch (error) {
            console.error('[VaultRailwaySync] Railway API error:', error);
            return { success: false, error: error.message };
        }
    },

    // Fetch a single variable from Railway
    async fetchSingleVariable(serviceId, key, token) {
        const service = this.getServiceConfig(serviceId);
        
        const query = `
            query GetServiceVariables($serviceId: String!) {
                service(id: $serviceId) {
                    variables {
                        edges {
                            node {
                                name
                                value
                            }
                        }
                    }
                }
            }
        `;

        const response = await fetch('https://backboard.railway.app/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                query, 
                variables: { serviceId: service.railwayService } 
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }

        const variables = data.data?.service?.variables?.edges || [];
        const variable = variables.find(v => v.node.name === key);
        
        return variable ? variable.node.value : null;
    },

    // Trigger deployment after variable change
    async triggerDeployment(serviceId) {
        // Use existing VaultRailwayDeploy if available
        if (typeof VaultRailwayDeploy !== 'undefined') {
            VaultRailwayDeploy.deployService(serviceId, { silent: true });
        }
    },

    // ============================================
    // SYNC STATUS TRACKING (Phase 1.2)
    // ============================================

    // Get sync metadata for a variable
    getVariableSyncMetadata(serviceId, key) {
        const metadata = localStorage.getItem('vault_sync_metadata');
        if (!metadata) return null;
        
        try {
            const data = JSON.parse(metadata);
            return data[serviceId]?.[key] || null;
        } catch (e) {
            return null;
        }
    },

    // Set sync status for a variable
    setVariableSyncStatus(serviceId, key, status, data = {}) {
        let metadata = {};
        const existing = localStorage.getItem('vault_sync_metadata');
        
        if (existing) {
            try {
                metadata = JSON.parse(existing);
            } catch (e) {
                console.error('[VaultRailwaySync] Failed to parse metadata');
            }
        }

        if (!metadata[serviceId]) {
            metadata[serviceId] = {};
        }

        metadata[serviceId][key] = {
            status, // 'synced', 'pending', 'syncing', 'failed', 'conflict'
            lastUpdated: Date.now(),
            ...data
        };

        localStorage.setItem('vault_sync_metadata', JSON.stringify(metadata));
        
        // Update UI if visible
        this.updateVariableStatusUI(serviceId, key, status, data);
    },

    // Get sync status display info
    getVariableSyncStatus(serviceId, key) {
        const metadata = this.getVariableSyncMetadata(serviceId, key);
        
        if (!metadata) {
            return { 
                status: 'unknown', 
                icon: '❓', 
                color: 'gray',
                label: 'Never synced'
            };
        }

        const statusMap = {
            'synced': { icon: '✅', color: 'green', label: 'Synced' },
            'pending': { icon: '⚠️', color: 'yellow', label: 'Pending' },
            'syncing': { icon: '🔄', color: 'blue', label: 'Syncing...' },
            'failed': { icon: '❌', color: 'red', label: 'Failed' },
            'conflict': { icon: '⚡', color: 'orange', label: 'Conflict' }
        };

        const statusInfo = statusMap[metadata.status] || statusMap['unknown'];
        
        return {
            ...statusInfo,
            lastSyncedAt: metadata.lastSyncedAt,
            lastSyncedText: metadata.lastSyncedAt 
                ? this.formatTimeAgo(metadata.lastSyncedAt)
                : 'Never'
        };
    },

    // Update status indicator in the UI
    updateVariableStatusUI(serviceId, key, status, data) {
        // Find the variable card
        const card = document.querySelector(`[data-service-id="${serviceId}"][data-variable="${key}"]`);
        if (!card) return;

        const statusInfo = this.getVariableSyncStatus(serviceId, key);
        
        // Find or create status indicator
        let indicator = card.querySelector('.sync-status-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'sync-status-indicator';
            card.appendChild(indicator);
        }

        indicator.innerHTML = `
            <span class="sync-icon ${statusInfo.color}">${statusInfo.icon}</span>
            <span class="sync-label">${statusInfo.label}</span>
            ${statusInfo.lastSyncedAt ? `<span class="sync-time">${statusInfo.lastSyncedText}</span>` : ''}
        `;

        // Add click handler for failed/conflict states
        if (status === 'failed' || status === 'conflict') {
            indicator.style.cursor = 'pointer';
            indicator.onclick = () => this.handleStatusClick(serviceId, key, status, data);
        }
    },

    // Handle click on status indicator
    handleStatusClick(serviceId, key, status, data) {
        if (status === 'failed') {
            // Retry sync
            const vaultData = VaultCore.loadVaultData();
            const value = vaultData.services[serviceId]?.[key];
            if (value !== undefined) {
                this.pushVariable(serviceId, key, value);
            }
        } else if (status === 'conflict') {
            // Show conflict resolution modal
            this.showConflictResolutionModal(serviceId, key, data);
        }
    },

    // Format time ago
    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    },

    // ============================================
    // CONFLICT RESOLUTION (Phase 1.3)
    // ============================================

    showConflictResolutionModal(serviceId, key, data) {
        const vaultData = VaultCore.loadVaultData();
        const localValue = vaultData.services[serviceId]?.[key];
        
        const modalHtml = `
            <div id="conflictModal" class="modal">
                <div class="modal-overlay" onclick="VaultRailwaySync.closeConflictModal()"></div>
                <div class="modal-content conflict-modal">
                    <div class="modal-header">
                        <h2>⚡ Conflict Detected</h2>
                        <button class="btn-close" onclick="VaultRailwaySync.closeConflictModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <p class="conflict-message">${data.message || 'This variable has been modified both locally and on Railway.'}</p>
                        
                        <div class="conflict-comparison">
                            <div class="conflict-side local">
                                <h3>Your Local Value</h3>
                                <div class="value-box">
                                    <code>${this.escapeHtml(localValue || 'Empty')}</code>
                                </div>
                            </div>
                            
                            <div class="conflict-side railway">
                                <h3>Railway's Value</h3>
                                <div class="value-box">
                                    <code>${this.escapeHtml(data.railwayValue || 'Empty')}</code>
                                </div>
                            </div>
                        </div>
                        
                        ${data.lastSyncedValue ? `
                            <div class="conflict-original">
                                <h3>Last Synced Value</h3>
                                <div class="value-box">
                                    <code>${this.escapeHtml(data.lastSyncedValue)}</code>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="VaultRailwaySync.closeConflictModal()">
                            Cancel (Keep Pending)
                        </button>
                        <button class="btn-secondary" onclick="VaultRailwaySync.resolveConflict('${serviceId}', '${key}', 'railway')">
                            Use Railway's
                        </button>
                        <button class="btn-primary" onclick="VaultRailwaySync.resolveConflict('${serviceId}', '${key}', 'local')">
                            Use Mine
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    closeConflictModal() {
        const modal = document.getElementById('conflictModal');
        if (modal) modal.remove();
    },

    async resolveConflict(serviceId, key, resolution) {
        const vaultData = VaultCore.loadVaultData();
        
        if (resolution === 'railway') {
            // Fetch Railway value and update local
            try {
                const railwayValue = await this.fetchSingleVariable(serviceId, key, vaultData.railwayToken);
                vaultData.services[serviceId][key] = railwayValue;
                VaultCore.saveVaultData(vaultData);
                
                this.setVariableSyncStatus(serviceId, key, 'synced', {
                    lastSyncedAt: Date.now(),
                    railwayValue: railwayValue,
                    localValue: railwayValue
                });
                
                VaultUI.showToast(`Updated ${key} from Railway`, 'success');
                VaultUI.selectService(serviceId); // Refresh UI
            } catch (error) {
                VaultUI.showToast(`Failed to fetch from Railway: ${error.message}`, 'error');
            }
        } else if (resolution === 'local') {
            // Push local value to Railway
            const localValue = vaultData.services[serviceId]?.[key];
            const result = await this.pushVariable(serviceId, key, localValue);
            
            if (result.success) {
                VaultUI.showToast(`Pushed your ${key} to Railway`, 'success');
            } else {
                VaultUI.showToast(`Failed to push: ${result.error}`, 'error');
            }
        }
        
        this.closeConflictModal();
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
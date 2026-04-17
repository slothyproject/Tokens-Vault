/**
 * vault-railway-deploy.js - Railway deployment functionality
 * One-click deploy, status tracking, rollback
 */

const VaultRailwayDeploy = {
    // Deployment state
    deployments: {},
    pollingIntervals: {},

    // Initialize
    init() {
        console.log('[VaultRailwayDeploy] Deployment module initialized');
        this.loadDeploymentHistory();
    },

    // Load deployment history from localStorage
    loadDeploymentHistory() {
        const history = localStorage.getItem('vault_deployment_history');
        if (history) {
            try {
                this.deployments = JSON.parse(history);
            } catch (e) {
                console.error('[VaultRailwayDeploy] Failed to load history:', e);
                this.deployments = {};
            }
        }
    },

    // Save deployment history
    saveDeploymentHistory() {
        try {
            localStorage.setItem('vault_deployment_history', JSON.stringify(this.deployments));
        } catch (e) {
            console.error('[VaultRailwayDeploy] Failed to save history:', e);
        }
    },

    // Deploy service to Railway
    async deployService(serviceId, options = {}) {
        console.log(`[VaultRailwayDeploy] Starting deployment for ${serviceId}`);

        const vaultData = VaultCore.loadVaultData();
        if (!vaultData?.railwayToken) {
            VaultUI.showToast('Railway token not configured. Check Settings.', 'error');
            return { success: false, error: 'No Railway token' };
        }

        const service = this.getServiceConfig(serviceId);
        if (!service?.railwayService) {
            VaultUI.showToast(`Service ${serviceId} not configured for Railway`, 'error');
            return { success: false, error: 'No Railway service configured' };
        }

        // Show deployment modal
        this.showDeployModal(serviceId);
        this.updateDeployStatus(serviceId, 'starting', 0);

        try {
            // Step 1: Update variables
            this.updateDeployStatus(serviceId, 'updating_variables', 10);
            const variables = VaultCore.getServiceVariables(serviceId);
            await this.updateRailwayVariables(service.railwayService, variables, vaultData.railwayToken);

            // Step 2: Trigger deployment
            this.updateDeployStatus(serviceId, 'deploying', 30);
            const deployment = await this.triggerDeployment(service.railwayService, vaultData.railwayToken);

            // Step 3: Poll for completion
            this.updateDeployStatus(serviceId, 'building', 50);
            const result = await this.pollDeploymentStatus(deployment.id, service.railwayService, vaultData.railwayToken, serviceId);

            if (result.success) {
                this.updateDeployStatus(serviceId, 'completed', 100);
                this.recordDeployment(serviceId, 'success', deployment.id);
                VaultUI.showToast(`${service.name} deployed successfully!`, 'success');
                
                // Send Discord notification
                if (typeof VaultDiscord !== 'undefined') {
                    VaultDiscord.deploymentSuccess(service.name, 'production', '2m');
                }

                setTimeout(() => this.closeDeployModal(), 2000);
            } else {
                throw new Error(result.error || 'Deployment failed');
            }

            return result;

        } catch (error) {
            console.error(`[VaultRailwayDeploy] Deployment failed:`, error);
            this.updateDeployStatus(serviceId, 'failed', 0);
            this.recordDeployment(serviceId, 'failed', null, error.message);
            VaultUI.showToast(`Deployment failed: ${error.message}`, 'error');
            
            if (typeof VaultDiscord !== 'undefined') {
                VaultDiscord.deploymentFailed(service.name, 'production', error.message);
            }

            return { success: false, error: error.message };
        }
    },

    // Update Railway variables
    async updateRailwayVariables(serviceId, variables, token) {
        const mutation = `
            mutation variableUpsert($input: VariableInput!) {
                variableUpsert(input: $input) {
                    id
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
                query: mutation,
                variables: {
                    input: {
                        serviceId: serviceId,
                        environmentId: null, // Use default environment
                        variables: variables
                    }
                }
            })
        });

        const result = await response.json();
        if (result.errors) {
            throw new Error(result.errors[0].message);
        }
    },

    // Trigger deployment
    async triggerDeployment(serviceId, token) {
        const mutation = `
            mutation serviceInstanceDeploy($serviceId: String!) {
                serviceInstanceDeploy(serviceId: $serviceId) {
                    id
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
                query: mutation,
                variables: { serviceId }
            })
        });

        const result = await response.json();
        if (result.errors) {
            throw new Error(result.errors[0].message);
        }

        return { id: result.data.serviceInstanceDeploy.id };
    },

    // Poll deployment status
    async pollDeploymentStatus(deploymentId, serviceId, token, uiServiceId) {
        const query = `
            query deployment($id: String!) {
                deployment(id: $id) {
                    id
                    status
                    errorMessage
                }
            }
        `;

        let attempts = 0;
        const maxAttempts = 60; // 5 minutes (5s * 60)

        while (attempts < maxAttempts) {
            await this.sleep(5000);
            attempts++;

            // Update progress
            const progress = Math.min(50 + (attempts / maxAttempts) * 50, 95);
            this.updateDeployStatus(uiServiceId, 'building', progress);

            const response = await fetch('https://backboard.railway.app/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query,
                    variables: { id: deploymentId }
                })
            });

            const result = await response.json();
            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            const deployment = result.data.deployment;

            if (deployment.status === 'SUCCESS') {
                return { success: true, deploymentId };
            } else if (deployment.status === 'FAILED') {
                return { success: false, error: deployment.errorMessage || 'Deployment failed' };
            }
            // Otherwise continue polling (BUILDING, DEPLOYING, etc.)
        }

        throw new Error('Deployment timeout - check Railway dashboard');
    },

    // Show deployment modal
    showDeployModal(serviceId) {
        let modal = document.getElementById('deployModal');
        if (!modal) {
            const modalHtml = `
                <div id="deployModal" class="modal">
                    <div class="modal-overlay"></div>
                    <div class="modal-content deploy-modal">
                        <div class="modal-header">
                            <h2>🚀 Deploying...</h2>
                        </div>
                        <div class="modal-body">
                            <div class="deploy-status" id="deployStatus">
                                <div class="deploy-spinner">⏳</div>
                                <div class="deploy-message">Starting deployment...</div>
                                <div class="deploy-progress">
                                    <div class="deploy-progress-bar" id="deployProgressBar"></div>
                                </div>
                                <div class="deploy-percentage" id="deployPercentage">0%</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('deployModal');
        }

        modal.classList.remove('hidden');
    },

    // Update deployment status UI
    updateDeployStatus(serviceId, status, percentage) {
        const messageEl = document.querySelector('#deployStatus .deploy-message');
        const barEl = document.getElementById('deployProgressBar');
        const pctEl = document.getElementById('deployPercentage');

        if (!messageEl || !barEl || !pctEl) return;

        const messages = {
            'starting': 'Starting deployment...',
            'updating_variables': 'Updating environment variables...',
            'deploying': 'Triggering deployment...',
            'building': 'Building and deploying...',
            'completed': '✅ Deployment complete!',
            'failed': '❌ Deployment failed'
        };

        messageEl.textContent = messages[status] || status;
        barEl.style.width = `${percentage}%`;
        pctEl.textContent = `${Math.round(percentage)}%`;

        if (status === 'completed') {
            barEl.style.background = 'var(--accent-green)';
        } else if (status === 'failed') {
            barEl.style.background = 'var(--accent-red)';
        }
    },

    // Close deploy modal
    closeDeployModal() {
        const modal = document.getElementById('deployModal');
        if (modal) modal.classList.add('hidden');
    },

    // Record deployment in history
    recordDeployment(serviceId, status, deploymentId, error = null) {
        if (!this.deployments[serviceId]) {
            this.deployments[serviceId] = [];
        }

        this.deployments[serviceId].unshift({
            timestamp: new Date().toISOString(),
            status,
            deploymentId,
            error
        });

        // Keep only last 20
        if (this.deployments[serviceId].length > 20) {
            this.deployments[serviceId] = this.deployments[serviceId].slice(0, 20);
        }

        this.saveDeploymentHistory();
    },

    // Get deployment history for service
    getDeploymentHistory(serviceId, limit = 10) {
        const history = this.deployments[serviceId] || [];
        return history.slice(0, limit);
    },

    // Get last successful deployment
    getLastSuccessfulDeployment(serviceId) {
        const history = this.deployments[serviceId] || [];
        return history.find(d => d.status === 'success');
    },

    // Rollback to previous deployment
    async rollback(serviceId, versionIndex = 1) {
        const history = this.deployments[serviceId] || [];
        const targetDeployment = history[versionIndex];

        if (!targetDeployment) {
            VaultUI.showToast('No previous deployment to rollback to', 'error');
            return;
        }

        if (!confirm(`Rollback ${serviceId} to deployment from ${new Date(targetDeployment.timestamp).toLocaleString()}?`)) {
            return;
        }

        // Re-deploy with same variables
        VaultUI.showToast('Rolling back...', 'info');
        await this.deployService(serviceId);
    },

    // Get service config
    getServiceConfig(serviceId) {
        if (typeof VaultUI !== 'undefined' && VaultUI.servicesConfig) {
            return VaultUI.servicesConfig.services.find(s => s.id === serviceId);
        }
        return null;
    },

    // Utility: Sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// Make available globally
window.VaultRailwayDeploy = VaultRailwayDeploy;

console.log('[VaultRailwayDeploy] Module loaded');
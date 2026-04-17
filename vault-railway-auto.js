// vault-railway-auto.js - Automatic Railway Deployment
// Triggers Railway deployment when variables change

class VaultRailwayAuto {
    constructor(token) {
        this.token = token;
        this.projectId = 'resplendent-fulfillment';
        this.api = new RailwayAPI(token);
    }

    // Deploy service with auto-retry
    async deployService(serviceConfig, variables, onProgress) {
        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            attempt++;
            
            try {
                onProgress({ step: 'deploy', message: `Deploying ${serviceConfig.name} (attempt ${attempt}/${maxRetries})...`, percent: 70 });
                
                const result = await this.api.deployWorkflow(serviceConfig, variables, onProgress);
                
                if (result.success) {
                    return result;
                }
                
                if (attempt < maxRetries) {
                    onProgress({ step: 'retry', message: `Retrying...`, percent: 75 });
                    await this.sleep(5000);
                }
            } catch (error) {
                if (attempt >= maxRetries) {
                    throw error;
                }
                await this.sleep(5000);
            }
        }

        throw new Error(`Deployment failed after ${maxRetries} attempts`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Auto-deploy on vault change
    async autoDeploy(vaultData, servicesConfig, serviceId, changes) {
        const service = servicesConfig.services.find(s => s.id === serviceId);
        if (!service) return { success: false, error: 'Service not found' };

        const variables = vaultData.services[serviceId] || {};
        if (Object.keys(variables).length === 0) {
            return { success: false, error: 'No variables to deploy' };
        }

        // Show progress UI
        this.showDeployProgress(service.name);

        const onProgress = (status) => {
            this.updateDeployProgress(status);
        };

        try {
            const result = await this.deployService(service, variables, onProgress);
            this.hideDeployProgress();
            
            // Add to history
            VaultData.addHistory(serviceId, 'RAILWAY_DEPLOY', 'auto-deployed');
            
            return { success: true, result };
        } catch (error) {
            this.hideDeployProgress();
            return { success: false, error: error.message };
        }
    }

    // UI helpers
    showDeployProgress(serviceName) {
        const overlay = document.createElement('div');
        overlay.id = 'deployOverlay';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center';
        overlay.innerHTML = `
            <div class="glass-strong rounded-2xl p-8 max-w-md w-full mx-4">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-semibold">Auto-Deploying ${serviceName}</h3>
                    <p id="deployStatusText" class="text-gray-400 mt-2">Starting deployment...</p>
                </div>
                <div class="w-full bg-gray-800 rounded-full h-2">
                    <div id="deployProgress" class="bg-purple-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    updateDeployProgress(status) {
        const progress = document.getElementById('deployProgress');
        const statusText = document.getElementById('deployStatusText');
        
        if (progress) {
            progress.style.width = `${status.percent}%`;
        }
        if (statusText) {
            statusText.textContent = status.message;
        }
    }

    hideDeployProgress() {
        const overlay = document.getElementById('deployOverlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

// Global auto-deploy manager
const AutoDeploy = {
    enabled: false,
    deployer: null,

    initialize() {
        const token = VaultData.getRailwayToken();
        if (token) {
            this.deployer = new VaultRailwayAuto(token);
            this.enabled = VaultData.getAutoDeploy();
            return true;
        }
        return false;
    },

    async onVaultChange(vaultData, servicesConfig, serviceId, changes) {
        if (!this.enabled || !this.deployer) {
            return { skipped: true };
        }

        // Don't auto-deploy if only Railway/GitHub tokens changed
        const isTokenOnly = changes.every(c => 
            c.variable === 'RAILWAY_TOKEN' || c.variable === 'GITHUB_TOKEN'
        );
        
        if (isTokenOnly) {
            return { skipped: true, reason: 'Token-only change' };
        }

        return this.deployer.autoDeploy(vaultData, servicesConfig, serviceId, changes);
    },

    enable() {
        this.enabled = true;
        VaultData.setAutoDeploy(true);
    },

    disable() {
        this.enabled = false;
        VaultData.setAutoDeploy(false);
    }
};

// Export
window.VaultRailwayAuto = VaultRailwayAuto;
window.AutoDeploy = AutoDeploy;

/**
 * vault-deploy.js - Intelligent Deployment Orchestrator
 * Manages multi-service deployments with dependency resolution and smart orchestration
 */

const VaultDeploy = {
    // Service dependencies - defines deployment order
    dependencies: {
        'dissident-backend': [], // Backend has no dependencies, deploy first
        'discord-bot': ['dissident-backend'], // Bot depends on backend
        'dissident-website': ['dissident-backend'], // Website depends on backend
        'tokens-vault': [] // Self, can deploy anytime
    },

    // Current deployment state
    state: {
        isDeploying: false,
        currentStep: 0,
        totalSteps: 0,
        results: {},
        errors: []
    },

    // Initialize
    init() {
        console.log('[VaultDeploy] Deployment orchestrator initialized');
    },

    // Get deployment order based on dependencies
    getDeploymentOrder(serviceIds = null) {
        const allServices = Object.keys(this.dependencies);
        const toDeploy = serviceIds || allServices;
        
        // Topological sort
        const visited = new Set();
        const temp = new Set();
        const order = [];
        
        const visit = (serviceId) => {
            if (temp.has(serviceId)) {
                throw new Error(`Circular dependency detected: ${serviceId}`);
            }
            if (visited.has(serviceId)) return;
            
            temp.add(serviceId);
            
            // Visit dependencies first
            const deps = this.dependencies[serviceId] || [];
            deps.forEach(dep => {
                if (toDeploy.includes(dep)) {
                    visit(dep);
                }
            });
            
            temp.delete(serviceId);
            visited.add(serviceId);
            order.push(serviceId);
        };
        
        toDeploy.forEach(service => visit(service));
        
        return order;
    },

    // Get services that can be deployed in parallel
    getParallelGroups(serviceIds = null) {
        const order = this.getDeploymentOrder(serviceIds);
        const groups = [];
        const deployed = new Set();
        
        while (order.length > 0) {
            const group = [];
            
            for (let i = 0; i < order.length; i++) {
                const service = order[i];
                const deps = this.dependencies[service] || [];
                
                // Check if all dependencies are deployed
                const depsSatisfied = deps.every(dep => deployed.has(dep) || !serviceIds?.includes(dep));
                
                if (depsSatisfied) {
                    group.push(service);
                    order.splice(i, 1);
                    i--;
                }
            }
            
            if (group.length > 0) {
                groups.push(group);
                group.forEach(s => deployed.add(s));
            } else {
                // Should not happen if no circular dependencies
                break;
            }
        }
        
        return groups;
    },

    // Deploy single service
    async deployService(serviceId, options = {}) {
        const vaultData = VaultCore.loadVaultData();
        if (!vaultData?.railwayToken) {
            throw new Error('Railway token not configured');
        }

        const service = this.getServiceConfig(serviceId);
        if (!service?.railwayService) {
            throw new Error(`Service ${serviceId} not configured for Railway`);
        }

        console.log(`[VaultDeploy] Deploying ${serviceId}...`);
        
        // Get variables (merged shared + local)
        const variables = VaultCore.getServiceVariables(serviceId);
        
        try {
            // Use Railway API
            if (typeof RailwayAPI !== 'undefined') {
                const api = new RailwayAPI(vaultData.railwayToken);
                
                // Update variables first
                await api.updateVariables(service.railwayService, variables);
                
                // Trigger deployment
                const deployment = await api.deployService(service.railwayService);
                
                // Wait for deployment if requested
                if (options.waitForCompletion) {
                    await this.waitForDeployment(api, deployment.id, serviceId, options.onProgress);
                }
                
                return {
                    serviceId,
                    success: true,
                    deploymentId: deployment.id,
                    timestamp: new Date().toISOString()
                };
            } else {
                throw new Error('Railway API not available');
            }
        } catch (error) {
            console.error(`[VaultDeploy] Failed to deploy ${serviceId}:`, error);
            return {
                serviceId,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    },

    // Wait for deployment to complete
    async waitForDeployment(api, deploymentId, serviceId, onProgress) {
        const maxAttempts = 60; // 5 minutes (5 second intervals)
        
        for (let i = 0; i < maxAttempts; i++) {
            const status = await api.getDeploymentStatus(deploymentId);
            
            const progress = Math.round((i / maxAttempts) * 100);
            if (onProgress) {
                onProgress(serviceId, progress, status.status);
            }
            
            if (status.status === 'SUCCESS') {
                return status;
            }
            
            if (status.status === 'FAILED') {
                throw new Error(`Deployment failed: ${status.error}`);
            }
            
            await this.sleep(5000);
        }
        
        throw new Error('Deployment timeout');
    },

    // Deploy all services
    async deployAll(options = {}) {
        if (this.state.isDeploying) {
            throw new Error('Deployment already in progress');
        }

        const serviceIds = options.services || Object.keys(this.dependencies);
        
        // Show preview first
        if (options.showPreview) {
            const preview = this.generateDeployPreview(serviceIds);
            this.showDeployPreviewModal(preview, options);
            return;
        }

        this.state.isDeploying = true;
        this.state.currentStep = 0;
        this.state.totalSteps = serviceIds.length;
        this.state.results = {};
        this.state.errors = [];

        const parallelGroups = this.getParallelGroups(serviceIds);
        
        console.log('[VaultDeploy] Deployment plan:', parallelGroups);

        try {
            for (const group of parallelGroups) {
                // Deploy group in parallel
                const promises = group.map(serviceId => 
                    this.deployService(serviceId, {
                        waitForCompletion: true,
                        onProgress: options.onProgress
                    })
                );
                
                const results = await Promise.all(promises);
                
                results.forEach(result => {
                    this.state.results[result.serviceId] = result;
                    if (!result.success) {
                        this.state.errors.push(result);
                    }
                });
                
                this.state.currentStep += group.length;
                
                // Stop on first error if stopOnError is set
                if (options.stopOnError && this.state.errors.length > 0) {
                    break;
                }
            }
            
            const summary = this.generateDeploySummary();
            
            // Send notification
            if (typeof VaultDiscord !== 'undefined') {
                if (this.state.errors.length === 0) {
                    VaultDiscord.deploymentSuccess('All Services', 'production', summary.duration);
                } else {
                    VaultDiscord.deploymentFailed('All Services', 'production', 
                        `${this.state.errors.length} services failed`);
                }
            }
            
            return summary;
            
        } finally {
            this.state.isDeploying = false;
        }
    },

    // Generate deployment preview
    generateDeployPreview(serviceIds) {
        const groups = this.getParallelGroups(serviceIds);
        const vaultData = VaultCore.loadVaultData();
        
        return {
            groups,
            services: serviceIds.map(id => {
                const service = this.getServiceConfig(id);
                const variables = VaultCore.getServiceVariables(id);
                const railwayVars = {}; // Would need to fetch from Railway
                
                return {
                    id,
                    name: service?.name || id,
                    variables: Object.keys(variables).length,
                    changes: this.calculateChanges(id, variables, railwayVars)
                };
            }),
            estimatedTime: serviceIds.length * 2 // ~2 minutes per service
        };
    },

    // Calculate what will change
    calculateChanges(serviceId, localVars, railwayVars) {
        const changes = {
            added: [],
            modified: [],
            removed: [],
            unchanged: []
        };
        
        // Check local vs Railway
        Object.entries(localVars).forEach(([key, value]) => {
            if (!(key in railwayVars)) {
                changes.added.push({ key, value });
            } else if (railwayVars[key] !== value) {
                changes.modified.push({ key, oldValue: railwayVars[key], newValue: value });
            } else {
                changes.unchanged.push({ key, value });
            }
        });
        
        // Check for removed
        Object.keys(railwayVars).forEach(key => {
            if (!(key in localVars)) {
                changes.removed.push({ key, value: railwayVars[key] });
            }
        });
        
        return changes;
    },

    // Show deployment preview modal
    showDeployPreviewModal(preview, options) {
        let modal = document.getElementById('deployPreviewModal');
        if (!modal) {
            const modalHtml = `
                <div id="deployPreviewModal" class="modal hidden">
                    <div class="modal-overlay" onclick="VaultDeploy.closePreviewModal()"></div>
                    <div class="modal-content deploy-preview-modal">
                        <div class="modal-header">
                            <h2>🚀 Deployment Preview</h2>
                            <button class="btn-close" onclick="VaultDeploy.closePreviewModal()">✕</button>
                        </div>
                        <div class="modal-body" id="deployPreviewBody"></div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="VaultDeploy.closePreviewModal()">Cancel</button>
                            <button class="btn-primary" id="confirmDeployBtn" onclick="VaultDeploy.confirmDeploy()">
                                🚀 Confirm Deploy
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('deployPreviewModal');
        }
        
        const body = document.getElementById('deployPreviewBody');
        
        let html = `
            <div class="deploy-plan">
                <h3>📋 Deployment Plan</h3>
                <p class="deploy-summary">${preview.services.length} services will be deployed in ${preview.groups.length} stages</p>
                
                ${preview.groups.map((group, index) => `
                    <div class="deploy-stage">
                        <h4>Stage ${index + 1}</h4>
                        <div class="stage-services">
                            ${group.map(serviceId => {
                                const service = preview.services.find(s => s.id === serviceId);
                                return `
                                    <div class="stage-service">
                                        <span class="service-name">${service.name}</span>
                                        <span class="service-changes">
                                            ${service.changes.added.length} new, 
                                            ${service.changes.modified.length} modified
                                        </span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="deploy-changes">
                <h3>📊 Changes Summary</h3>
                ${preview.services.map(service => {
                    const changes = service.changes;
                    const totalChanges = changes.added.length + changes.modified.length + changes.removed.length;
                    
                    if (totalChanges === 0) {
                        return `<p class="no-changes">${service.name}: No changes</p>`;
                    }
                    
                    return `
                        <div class="service-changes-preview">
                            <h4>${service.name}</h4>
                            ${changes.added.length ? `
                                <div class="change-group added">
                                    <span class="change-count">+${changes.added.length}</span>
                                    <span class="change-label">new variables</span>
                                </div>
                            ` : ''}
                            ${changes.modified.length ? `
                                <div class="change-group modified">
                                    <span class="change-count">~${changes.modified.length}</span>
                                    <span class="change-label">modified</span>
                                </div>
                            ` : ''}
                            ${changes.removed.length ? `
                                <div class="change-group removed">
                                    <span class="change-count">-${changes.removed.length}</span>
                                    <span class="change-label">removed</span>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="deploy-estimate">
                <p>⏱️ Estimated time: ~${preview.estimatedTime} minutes</p>
            </div>
        `;
        
        body.innerHTML = html;
        
        // Store options for confirmation
        modal.dataset.services = JSON.stringify(options.services);
        modal.dataset.stopOnError = options.stopOnError;
        
        modal.classList.remove('hidden');
    },

    // Close preview modal
    closePreviewModal() {
        const modal = document.getElementById('deployPreviewModal');
        if (modal) modal.classList.add('hidden');
    },

    // Confirm deployment from preview
    async confirmDeploy() {
        const modal = document.getElementById('deployPreviewModal');
        const services = JSON.parse(modal.dataset.services || '[]');
        const stopOnError = modal.dataset.stopOnError === 'true';
        
        this.closePreviewModal();
        
        // Show progress modal
        this.showDeployProgressModal();
        
        // Start deployment
        try {
            const result = await this.deployAll({
                services,
                stopOnError,
                onProgress: (serviceId, progress, status) => {
                    this.updateDeployProgress(serviceId, progress, status);
                }
            });
            
            this.showDeployCompleteModal(result);
            
        } catch (error) {
            this.showDeployErrorModal(error);
        }
    },

    // Show deployment progress modal
    showDeployProgressModal() {
        let modal = document.getElementById('deployProgressModal');
        if (!modal) {
            const modalHtml = `
                <div id="deployProgressModal" class="modal">
                    <div class="modal-overlay"></div>
                    <div class="modal-content deploy-progress-modal">
                        <div class="modal-header">
                            <h2>🚀 Deploying...</h2>
                        </div>
                        <div class="modal-body" id="deployProgressBody">
                            <div class="deploy-progress-list"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('deployProgressModal');
        }
        
        modal.classList.remove('hidden');
    },

    // Update deploy progress
    updateDeployProgress(serviceId, progress, status) {
        const list = document.querySelector('.deploy-progress-list');
        if (!list) return;
        
        let item = list.querySelector(`[data-service="${serviceId}"]`);
        if (!item) {
            item = document.createElement('div');
            item.className = 'deploy-progress-item';
            item.dataset.service = serviceId;
            list.appendChild(item);
        }
        
        const service = this.getServiceConfig(serviceId);
        item.innerHTML = `
            <div class="progress-service">${service?.name || serviceId}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="progress-status">${status}</div>
        `;
    },

    // Generate deployment summary
    generateDeploySummary() {
        const startTime = new Date();
        const successful = Object.values(this.state.results).filter(r => r.success).length;
        const failed = this.state.errors.length;
        
        return {
            timestamp: startTime.toISOString(),
            duration: 'N/A', // Calculate actual duration
            total: this.state.totalSteps,
            successful,
            failed,
            results: this.state.results,
            errors: this.state.errors
        };
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

window.VaultDeploy = VaultDeploy;

console.log('[VaultDeploy] Deployment orchestrator loaded');
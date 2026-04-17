// vault-railway.js - Railway API integration for Token Vault

const VaultRailway = {
    // Railway API base URL
    apiBase: 'https://railway.app/api/v1',

    // Get stored token
    getToken() {
        return VaultData.getRailwayToken();
    },

    // Make authenticated API request
    async apiRequest(endpoint, options = {}) {
        const token = this.getToken();
        if (!token) {
            throw new Error('Railway token not configured');
        }

        const url = `${this.apiBase}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Railway API error: ${response.status} - ${error}`);
        }

        return response.json();
    },

    // Get project info
    async getProject(projectId) {
        return this.apiRequest(`/projects/${projectId}`);
    },

    // Get service info
    async getService(serviceId) {
        return this.apiRequest(`/services/${serviceId}`);
    },

    // Get service variables
    async getServiceVariables(serviceId) {
        return this.apiRequest(`/services/${serviceId}/variables`);
    },

    // Update service variables
    async updateServiceVariables(serviceId, variables) {
        return this.apiRequest(`/services/${serviceId}/variables`, {
            method: 'PUT',
            body: JSON.stringify({ variables })
        });
    },

    // Deploy service
    async deployService(serviceId) {
        return this.apiRequest(`/services/${serviceId}/deploy`, {
            method: 'POST'
        });
    },

    // Get deployment status
    async getDeploymentStatus(deploymentId) {
        return this.apiRequest(`/deployments/${deploymentId}`);
    },

    // Deploy service with variables
    async deployServiceWithVariables(serviceConfig, variables) {
        const serviceId = serviceConfig.railwayService;
        
        try {
            // 1. Update variables
            await this.updateServiceVariables(serviceId, variables);
            
            // 2. Trigger deployment
            const deployResult = await this.deployService(serviceId);
            
            // 3. Return result
            return {
                success: true,
                service: serviceConfig.name,
                deploymentId: deployResult.id,
                status: deployResult.status
            };
        } catch (error) {
            console.error('Deployment failed:', error);
            return {
                success: false,
                service: serviceConfig.name,
                error: error.message
            };
        }
    },

    // Check service health
    async checkServiceHealth(serviceConfig) {
        try {
            const service = await this.getService(serviceConfig.railwayService);
            return {
                online: service.status === 'SUCCESS',
                status: service.status,
                lastDeployed: service.updatedAt
            };
        } catch (error) {
            return {
                online: false,
                status: 'ERROR',
                error: error.message
            };
        }
    },

    // Generate CLI commands for manual deployment
    generateCliCommands(serviceConfig, variables) {
        const commands = [
            `# Deploy ${serviceConfig.name} to Railway`,
            `#`,
            `# Install Railway CLI:`,
            `# npm install -g @railway/cli`,
            `#`,
            '',
            '# Login to Railway',
            'railway login',
            '',
            `# Link to service: ${serviceConfig.railwayService}`,
            `railway link --project resplendent-fulfillment --service ${serviceConfig.railwayService}`,
            '',
            '# Set environment variables',
            ...Object.entries(variables).map(([key, value]) => {
                // Escape special characters
                const escaped = value.replace(/"/g, '\\"');
                return `railway variables set "${key}=${escaped}"`;
            }),
            '',
            '# Deploy',
            'railway up',
            '',
            '# Verify deployment',
            `curl ${serviceConfig.deployUrl}/api/health || echo "Health check failed"`
        ];

        return commands.join('\n');
    },

    // Export as .env file content
    generateEnvFile(variables) {
        let content = '# Railway Environment Variables\n';
        content += `# Generated: ${new Date().toISOString()}\n\n`;
        
        Object.entries(variables).forEach(([key, value]) => {
            if (value) {
                // Quote values with spaces or special chars
                const needsQuotes = value.includes(' ') || value.includes('$');
                const formattedValue = needsQuotes ? `"${value}"` : value;
                content += `${key}=${formattedValue}\n`;
            }
        });

        return content;
    },

    // Generate Railway dashboard URLs
    getDashboardUrls(serviceConfig) {
        return {
            service: `https://railway.app/project/resplendent-fulfillment/service/${serviceConfig.railwayService}`,
            variables: `https://railway.app/project/resplendent-fulfillment/service/${serviceConfig.railwayService}/variables`,
            deployments: `https://railway.app/project/resplendent-fulfillment/service/${serviceConfig.railwayService}/deployments`,
            logs: `https://railway.app/project/resplendent-fulfillment/service/${serviceConfig.railwayService}/logs`
        };
    },

    // Test connection
    async testConnection() {
        try {
            const projects = await this.apiRequest('/projects');
            return {
                success: true,
                message: `Connected to Railway. Found ${projects.length} projects.`
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    },

    // Get all services status
    async getAllServicesStatus(servicesConfig) {
        const results = [];
        
        for (const service of servicesConfig.services) {
            try {
                const health = await this.checkServiceHealth(service);
                results.push({
                    ...service,
                    ...health
                });
            } catch (error) {
                results.push({
                    ...service,
                    online: false,
                    status: 'ERROR',
                    error: error.message
                });
            }
        }

        return results;
    },

    // Rollback to previous deployment
    async rollback(serviceId) {
        // Get recent deployments
        const deployments = await this.apiRequest(`/services/${serviceId}/deployments`);
        
        if (deployments.length < 2) {
            throw new Error('No previous deployment to rollback to');
        }

        // Previous deployment (index 1, since 0 is current)
        const previousDeployment = deployments[1];
        
        // Redeploy previous version
        return this.apiRequest(`/deployments/${previousDeployment.id}/redeploy`, {
            method: 'POST'
        });
    },

    // Poll deployment status
    async pollDeploymentStatus(deploymentId, callback, maxAttempts = 30) {
        let attempts = 0;
        
        const poll = async () => {
            if (attempts >= maxAttempts) {
                callback({ status: 'TIMEOUT', message: 'Deployment check timed out' });
                return;
            }

            try {
                const status = await this.getDeploymentStatus(deploymentId);
                callback(status);

                if (status.status === 'SUCCESS' || status.status === 'FAILED') {
                    return; // Deployment complete
                }

                attempts++;
                setTimeout(poll, 5000); // Poll every 5 seconds
            } catch (error) {
                callback({ status: 'ERROR', error: error.message });
            }
        };

        poll();
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VaultRailway;
}

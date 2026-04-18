// vault-railway-api.js - Complete Railway API Integration (Phase 3)
// Enables direct deployment from Token Vault UI to Railway

class RailwayAPI {
    constructor(token) {
        this.token = token;
        this.baseUrl = 'https://backboard.railway.app/graphql';
        this.projectId = 'resplendent-fulfillment';
    }

    // GraphQL query executor
    async execute(query, variables = {}) {
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ query, variables })
        });

        if (!response.ok) {
            throw new Error(`Railway API error: ${response.status}`);
        }

        const data = await response.json();
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }

        return data.data;
    }

    // Get project information
    async getProject() {
        const query = `
            query GetProject($id: String!) {
                project(id: $id) {
                    id
                    name
                    services {
                        edges {
                            node {
                                id
                                name
                                status
                                updatedAt
                            }
                        }
                    }
                }
            }
        `;

        return this.execute(query, { id: this.projectId });
    }

    // Get service details
    async getService(serviceName) {
        const query = `
            query GetService($projectId: String!, $serviceName: String!) {
                project(id: $projectId) {
                    service(name: $serviceName) {
                        id
                        name
                        status
                        deployments {
                            edges {
                                node {
                                    id
                                    status
                                    createdAt
                                }
                            }
                        }
                    }
                }
            }
        `;

        const result = await this.execute(query, { 
            projectId: this.projectId, 
            serviceName 
        });
        
        return result.project?.service;
    }

    // Update service variables
    async updateVariables(serviceId, variables) {
        // Convert variables object to Railway format
        const variableInputs = Object.entries(variables).map(([name, value]) => ({
            name,
            value: value.toString()
        }));

        const mutation = `
            mutation UpdateVariables($serviceId: String!, $variables: [VariableInput!]!) {
                variableUpsert(serviceId: $serviceId, variables: $variables) {
                    id
                    name
                    value
                }
            }
        `;

        return this.execute(mutation, { 
            serviceId, 
            variables: variableInputs 
        });
    }

    // Deploy service
    async deployService(serviceId) {
        const mutation = `
            mutation DeployService($serviceId: String!) {
                deploy(serviceId: $serviceId) {
                    id
                    status
                    url
                }
            }
        `;

        return this.execute(mutation, { serviceId });
    }

    // Get deployment status
    async getDeploymentStatus(deploymentId) {
        const query = `
            query GetDeployment($id: String!) {
                deployment(id: $id) {
                    id
                    status
                    url
                    createdAt
                    updatedAt
                }
            }
        `;

        return this.execute(query, { id: deploymentId });
    }

    // Check if service is healthy
    async isServiceHealthy(serviceName) {
        try {
            const service = await this.getService(serviceName);
            return service?.status === 'SUCCESS';
        } catch {
            return false;
        }
    }

    // Get service URL
    async getServiceUrl(serviceName) {
        const service = await this.getService(serviceName);
        
        // Find latest successful deployment
        const deployments = service?.deployments?.edges || [];
        for (const edge of deployments) {
            if (edge.node.status === 'SUCCESS') {
                return edge.node.url;
            }
        }
        
        return null;
    }

    // Poll deployment until complete
    async pollDeployment(deploymentId, callback, maxAttempts = 30) {
        let attempts = 0;
        
        const check = async () => {
            if (attempts >= maxAttempts) {
                callback({ status: 'TIMEOUT', message: 'Deployment check timed out' });
                return;
            }

            try {
                const deployment = await this.getDeploymentStatus(deploymentId);
                callback(deployment);

                if (deployment.status === 'SUCCESS' || deployment.status === 'FAILED') {
                    return;
                }

                attempts++;
                setTimeout(check, 5000);
            } catch (error) {
                callback({ status: 'ERROR', error: error.message });
            }
        };

        check();
    }

    // Full deployment workflow
    async deployWorkflow(serviceConfig, variables, onProgress) {
        const steps = [
            { name: 'Connecting to Railway', weight: 10 },
            { name: 'Verifying service', weight: 10 },
            { name: 'Updating variables', weight: 30 },
            { name: 'Triggering deployment', weight: 20 },
            { name: 'Waiting for deployment', weight: 30 }
        ];

        let progress = 0;
        
        onProgress({ step: 0, message: 'Starting deployment...', percent: 0 });

        try {
            // Step 1: Connect
            onProgress({ step: 1, message: 'Connecting to Railway...', percent: 5 });
            const service = await this.getService(serviceConfig.railwayService);
            if (!service) {
                throw new Error(`Service ${serviceConfig.railwayService} not found`);
            }
            
            // Step 2: Update variables
            onProgress({ step: 2, message: 'Updating environment variables...', percent: 20 });
            await this.updateVariables(service.id, variables);
            
            // Step 3: Deploy
            onProgress({ step: 3, message: 'Triggering deployment...', percent: 50 });
            const deployResult = await this.deployService(service.id);
            
            // Step 4: Wait for completion
            onProgress({ step: 4, message: 'Waiting for deployment to complete...', percent: 70 });
            
            return new Promise((resolve, reject) => {
                this.pollDeployment(deployResult.deploy.id, (status) => {
                    onProgress({ 
                        step: 4, 
                        message: `Deployment status: ${status.status}`, 
                        percent: 70 + (status.status === 'SUCCESS' ? 30 : 0)
                    });

                    if (status.status === 'SUCCESS') {
                        resolve({
                            success: true,
                            service: serviceConfig.name,
                            deploymentId: deployResult.deploy.id,
                            url: status.url || serviceConfig.deployUrl
                        });
                    } else if (status.status === 'FAILED') {
                        reject(new Error('Deployment failed'));
                    } else if (status.status === 'TIMEOUT') {
                        reject(new Error('Deployment timed out'));
                    } else if (status.status === 'ERROR') {
                        reject(new Error(status.error || 'Unknown error'));
                    }
                }, 60); // 60 attempts = 5 minutes
            });

        } catch (error) {
            throw error;
        }
    }

    // Validate token
    async validateToken() {
        try {
            const project = await this.getProject();
            return {
                valid: true,
                project: project.project.name,
                services: project.project.services.edges.length
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    // Generate CLI command alternative
    generateCliCommand(serviceConfig, variables) {
        const varCommands = Object.entries(variables)
            .map(([key, value]) => {
                // Escape special characters for shell
                const escaped = value
                    .replace(/\\/g, '\\\\')
                    .replace(/"/g, '\\"')
                    .replace(/'/g, "'\"'\"'");
                return `railway variables set "${key}=${escaped}"`;
            });

        return [
            `# Deploy ${serviceConfig.name}`,
            ``,
            `# Login to Railway`,
            `railway login`,
            ``,
            `# Link to project and service`,
            `railway link --project ${this.projectId} --service ${serviceConfig.railwayService}`,
            ``,
            `# Set environment variables`,
            ...varCommands,
            ``,
            `# Deploy`,
            `railway up`,
            ``,
            `# Verify`,
            `curl ${serviceConfig.deployUrl}/api/health || echo "Health check failed"`
        ].join('\n');
    }
}

// Service definitions for Railway
const RailwayServices = {
    'dissident-backend': {
        railwayService: 'dissident-api-backend',
        deployUrl: 'https://dissident-api-backend-production.up.railway.app'
    },
    'dissident-website': {
        railwayService: 'Dissident-Website',
        deployUrl: 'https://dissident.mastertibbles.co.uk'
    },
    'tokens-vault': {
        railwayService: 'dissident-tokens-vault',
        deployUrl: 'https://dissidenttokens.mastertibbles.co.uk'
    }
};

// Export
window.RailwayAPI = RailwayAPI;
window.RailwayServices = RailwayServices;

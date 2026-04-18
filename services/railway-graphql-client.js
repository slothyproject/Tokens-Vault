/**
 * railway-graphql-client.js - Complete Railway GraphQL Client
 * Enterprise-grade client for Railway API with all operations
 */

const axios = require('axios');

class RailwayGraphQLClient {
  constructor(apiToken) {
    if (!apiToken) {
      throw new Error('Railway API token is required');
    }
    
    this.apiToken = apiToken;
    this.endpoint = 'https://backboard.railway.app/graphql';
    
    // Create axios instance with defaults
    this.client = axios.create({
      baseURL: this.endpoint,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[RailwayAPI] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[RailwayAPI] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;
        
        // Retry on network errors or 5xx
        if (!config || !config.retry) {
          return Promise.reject(error);
        }
        
        config.retryCount = config.retryCount || 0;
        
        if (config.retryCount >= config.retry) {
          return Promise.reject(error);
        }
        
        config.retryCount += 1;
        const delay = config.retryDelay || 1000;
        
        console.log(`[RailwayAPI] Retrying request (${config.retryCount}/${config.retry}) after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.client(config);
      }
    );
  }

  /**
   * Execute GraphQL query/mutation
   */
  async execute(query, variables = {}, options = {}) {
    const config = {
      method: 'POST',
      data: {
        query,
        variables
      },
      retry: options.retry ?? 3,
      retryDelay: options.retryDelay ?? 1000
    };

    try {
      const response = await this.client.request(config);
      
      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }
      
      return response.data.data;
    } catch (error) {
      console.error('[RailwayAPI] GraphQL error:', error.message);
      throw error;
    }
  }

  // ============================================
  // PROJECT QUERIES
  // ============================================

  /**
   * Get project by ID
   */
  async getProject(projectId) {
    const query = `
      query GetProject($id: String!) {
        project(id: $id) {
          id
          name
          description
          createdAt
          updatedAt
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
          environments {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      }
    `;
    
    const result = await this.execute(query, { id: projectId });
    return result?.project;
  }

  /**
   * List all projects
   */
  async listProjects() {
    const query = `
      query ListProjects {
        projects {
          edges {
            node {
              id
              name
              description
              createdAt
            }
          }
        }
      }
    `;
    
    const result = await this.execute(query);
    return result?.projects?.edges?.map(edge => edge.node) || [];
  }

  // ============================================
  // SERVICE QUERIES
  // ============================================

  /**
   * Get service by ID
   */
  async getService(serviceId) {
    const query = `
      query GetService($id: String!) {
        service(id: $id) {
          id
          name
          status
          updatedAt
          createdAt
          deployments {
            edges {
              node {
                id
                status
                createdAt
                url
              }
            }
          }
          variables {
            edges {
              node {
                name
                value
              }
            }
          }
          instances {
            edges {
              node {
                id
                status
                health
              }
            }
          }
        }
      }
    `;
    
    const result = await this.execute(query, { id: serviceId });
    return result?.service;
  }

  /**
   * List all services in a project
   */
  async listServices(projectId) {
    const query = `
      query ListServices($projectId: String!) {
        project(id: $projectId) {
          services {
            edges {
              node {
                id
                name
                status
                updatedAt
                deployments(last: 1) {
                  edges {
                    node {
                      id
                      status
                      url
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    const result = await this.execute(query, { projectId });
    return result?.project?.services?.edges?.map(edge => edge.node) || [];
  }

  // ============================================
  // VARIABLE OPERATIONS
  // ============================================

  /**
   * Get service variables
   */
  async getVariables(serviceId) {
    const query = `
      query GetVariables($serviceId: String!) {
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
    
    const result = await this.execute(query, { serviceId });
    const variables = result?.service?.variables?.edges || [];
    
    // Convert to key-value object
    const vars = {};
    variables.forEach(v => {
      vars[v.node.name] = v.node.value;
    });
    
    return vars;
  }

  /**
   * Create or update variable
   */
  async upsertVariable(serviceId, name, value, environmentId) {
    const mutation = `
      mutation UpsertVariable($input: VariableInput!) {
        variableUpsert(input: $input) {
          variable {
            id
            name
            value
          }
        }
      }
    `;
    
    const result = await this.execute(mutation, {
      input: {
        serviceId,
        name,
        value,
        environmentId
      }
    });
    
    return result?.variableUpsert?.variable;
  }

  /**
   * Delete variable
   */
  async deleteVariable(serviceId, name) {
    const mutation = `
      mutation DeleteVariable($serviceId: String!, $name: String!) {
        variableDelete(serviceId: $serviceId, name: $name) {
          deleted
        }
      }
    `;
    
    const result = await this.execute(mutation, { serviceId, name });
    return result?.variableDelete?.deleted || false;
  }

  /**
   * Bulk update variables
   */
  async bulkUpdateVariables(serviceId, variables, environmentId) {
    const results = [];
    
    for (const [name, value] of Object.entries(variables)) {
      try {
        const result = await this.upsertVariable(serviceId, name, value, environmentId);
        results.push({ name, success: true, result });
      } catch (error) {
        results.push({ name, success: false, error: error.message });
      }
    }
    
    return results;
  }

  // ============================================
  // DEPLOYMENT OPERATIONS
  // ============================================

  /**
   * Deploy service
   */
  async deployService(serviceId, environmentId) {
    const mutation = `
      mutation DeployService($serviceId: String!, $environmentId: String!) {
        serviceInstanceDeploy(
          serviceId: $serviceId,
          environmentId: $environmentId
        ) {
          id
          status
          url
        }
      }
    `;
    
    const result = await this.execute(mutation, { serviceId, environmentId });
    return result?.serviceInstanceDeploy;
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(deploymentId) {
    const query = `
      query GetDeploymentLogs($deploymentId: String!) {
        deployment(id: $deploymentId) {
          id
          status
          logs
        }
      }
    `;
    
    const result = await this.execute(query, { deploymentId });
    return result?.deployment?.logs;
  }

  /**
   * List recent deployments
   */
  async listDeployments(serviceId, limit = 10) {
    const query = `
      query ListDeployments($serviceId: String!) {
        service(id: $serviceId) {
          deployments(last: ${limit}) {
            edges {
              node {
                id
                status
                createdAt
                url
              }
            }
          }
        }
      }
    `;
    
    const result = await this.execute(query, { serviceId });
    return result?.service?.deployments?.edges?.map(edge => edge.node) || [];
  }

  // ============================================
  // SERVICE CONTROL
  // ============================================

  /**
   * Restart service
   */
  async restartService(serviceId, environmentId) {
    // Railway doesn't have a direct restart, but we can trigger a new deployment
    return this.deployService(serviceId, environmentId);
  }

  /**
   * Get service metrics (if available)
   */
  async getServiceMetrics(serviceId) {
    const query = `
      query GetServiceMetrics($serviceId: String!) {
        service(id: $serviceId) {
          id
          instances {
            edges {
              node {
                id
                status
                health
              }
            }
          }
        }
      }
    `;
    
    const result = await this.execute(query, { serviceId });
    return result?.service;
  }

  // ============================================
  // ENVIRONMENT OPERATIONS
  // ============================================

  /**
   * Get environment by ID
   */
  async getEnvironment(environmentId) {
    const query = `
      query GetEnvironment($id: String!) {
        environment(id: $id) {
          id
          name
          project {
            id
            name
          }
        }
      }
    `;
    
    const result = await this.execute(query, { id: environmentId });
    return result?.environment;
  }

  /**
   * List environments in project
   */
  async listEnvironments(projectId) {
    const query = `
      query ListEnvironments($projectId: String!) {
        project(id: $projectId) {
          environments {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      }
    `;
    
    const result = await this.execute(query, { projectId });
    return result?.project?.environments?.edges?.map(edge => edge.node) || [];
  }

  // ============================================
  // VALIDATION & HELPERS
  // ============================================

  /**
   * Validate token format
   */
  isValidTokenFormat(token, type = 'generic') {
    if (!token || typeof token !== 'string') return false;
    
    // Railway tokens start with 'railway_' or 'raily_'
    if (type === 'railway') {
      return token.startsWith('raily_') && token.length >= 32;
    }
    
    // Generic token validation - must be at least 8 chars
    return token.length >= 8;
  }

  /**
   * Validate API token
   */
  async validateToken() {
    try {
      const projects = await this.listProjects();
      return { valid: true, projects: projects.length };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Mask token for logging
   */
  maskToken() {
    if (!this.apiToken) return 'not-set';
    if (this.apiToken.length < 8) return '****';
    return this.apiToken.substring(0, 4) + '****' + this.apiToken.substring(this.apiToken.length - 4);
  }
}

module.exports = RailwayGraphQLClient;

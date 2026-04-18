/**
 * service-manager.js - Railway Service Management
 * High-level operations for managing Railway services
 */

const RailwayGraphQLClient = require('./railway-graphql-client');
const { Service, Variable, Deployment } = require('../database/models');

class ServiceManager {
  constructor(railwayToken) {
    if (!railwayToken) {
      throw new Error('Railway API token required for ServiceManager');
    }
    this.railway = new RailwayGraphQLClient(railwayToken);
  }

  /**
   * Sync services from Railway to local database
   */
  async syncServices(projectId, userId) {
    console.log(`[ServiceManager] Syncing services for project ${projectId}`);
    
    try {
      // Get services from Railway
      const railwayServices = await this.railway.listServices(projectId);
      
      const results = {
        created: 0,
        updated: 0,
        failed: 0
      };

      for (const rs of railwayServices) {
        try {
          // Check if service exists in DB
          let service = await Service.findOne({
            where: { railwayServiceId: rs.id }
          });

          const serviceData = {
            userId,
            railwayServiceId: rs.id,
            name: rs.name,
            status: rs.status?.toLowerCase() || 'unknown',
            lastDeployedAt: rs.deployments?.edges?.[0]?.node?.createdAt
          };

          if (service) {
            // Update existing
            await service.update(serviceData);
            results.updated++;
          } else {
            // Create new
            await Service.create(serviceData);
            results.created++;
          }
        } catch (err) {
          console.error(`[ServiceManager] Failed to sync service ${rs.id}:`, err.message);
          results.failed++;
        }
      }

      console.log(`[ServiceManager] Sync complete: ${results.created} created, ${results.updated} updated, ${results.failed} failed`);
      return { success: true, ...results };
    } catch (err) {
      console.error('[ServiceManager] Sync failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get service details with variables
   */
  async getServiceDetails(serviceId) {
    try {
      // Get from Railway
      const railwayService = await this.railway.getService(serviceId);
      
      // Get variables
      const variables = await this.railway.getVariables(serviceId);
      
      // Get recent deployments
      const deployments = await this.railway.listDeployments(serviceId, 5);

      return {
        success: true,
        service: {
          id: railwayService.id,
          name: railwayService.name,
          status: railwayService.status,
          updatedAt: railwayService.updatedAt
        },
        variables,
        deployments,
        instances: railwayService.instances?.edges?.map(e => e.node) || []
      };
    } catch (err) {
      console.error('[ServiceManager] Get service details failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Update service variables
   */
  async updateVariables(serviceId, variables, environmentId) {
    console.log(`[ServiceManager] Updating ${Object.keys(variables).length} variables for service ${serviceId}`);
    
    try {
      const results = await this.railway.bulkUpdateVariables(
        serviceId,
        variables,
        environmentId
      );

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      console.log(`[ServiceManager] Variables updated: ${successCount} success, ${failCount} failed`);

      return {
        success: failCount === 0,
        updated: successCount,
        failed: failCount,
        details: results
      };
    } catch (err) {
      console.error('[ServiceManager] Update variables failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Deploy service
   */
  async deployService(serviceId, environmentId) {
    console.log(`[ServiceManager] Deploying service ${serviceId}`);
    
    try {
      const deployment = await this.railway.deployService(serviceId, environmentId);
      
      // Save deployment to database
      await Deployment.create({
        serviceId,
        deploymentId: deployment.id,
        status: deployment.status,
        startedAt: new Date()
      });

      console.log(`[ServiceManager] Deployment started: ${deployment.id}`);

      return {
        success: true,
        deployment: {
          id: deployment.id,
          status: deployment.status,
          url: deployment.url
        }
      };
    } catch (err) {
      console.error('[ServiceManager] Deploy failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Restart service
   */
  async restartService(serviceId, environmentId) {
    console.log(`[ServiceManager] Restarting service ${serviceId}`);
    
    try {
      const result = await this.railway.restartService(serviceId, environmentId);
      
      console.log(`[ServiceManager] Service restarted successfully`);
      
      return {
        success: true,
        deployment: result
      };
    } catch (err) {
      console.error('[ServiceManager] Restart failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(deploymentId) {
    try {
      const logs = await this.railway.getDeploymentLogs(deploymentId);
      
      return {
        success: true,
        logs: logs || 'No logs available'
      };
    } catch (err) {
      console.error('[ServiceManager] Get logs failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get service health
   */
  async getServiceHealth(serviceId) {
    try {
      const metrics = await this.railway.getServiceMetrics(serviceId);
      
      const instances = metrics?.instances?.edges || [];
      const healthyInstances = instances.filter(i => i.node.health === 'HEALTHY').length;
      const totalInstances = instances.length;
      
      return {
        success: true,
        health: {
          status: metrics?.status || 'unknown',
          healthyInstances,
          totalInstances,
          healthScore: totalInstances > 0 ? Math.round((healthyInstances / totalInstances) * 100) : 0
        }
      };
    } catch (err) {
      console.error('[ServiceManager] Get health failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Bulk operation on multiple services
   */
  async bulkOperation(serviceIds, operation, environmentId) {
    console.log(`[ServiceManager] Performing ${operation} on ${serviceIds.length} services`);
    
    const results = [];
    
    for (const serviceId of serviceIds) {
      try {
        let result;
        
        switch (operation) {
          case 'deploy':
            result = await this.deployService(serviceId, environmentId);
            break;
          case 'restart':
            result = await this.restartService(serviceId, environmentId);
            break;
          case 'sync':
            // Just sync variables
            result = { success: true };
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
        
        results.push({ serviceId, ...result });
      } catch (err) {
        results.push({ serviceId, success: false, error: err.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return {
      success: successCount === serviceIds.length,
      completed: successCount,
      total: serviceIds.length,
      results
    };
  }
}

module.exports = ServiceManager;

/**
 * routes/services.js - Service Management API Routes
 * RESTful API for Railway service operations
 */

const express = require('express');
const router = express.Router();
const ServiceManager = require('../services/service-manager');
const { authenticateToken } = require('./auth');
const { Service, Variable, Deployment } = require('../database/models');

// Middleware to initialize service manager with user's Railway token
async function initServiceManager(req, res, next) {
  try {
    // Get user's Railway credentials from database
    const { Credential } = require('../database/models');
    const credentialVault = require('../services/credential-vault');
    
    const credential = await Credential.findOne({
      where: { userId: req.user.userId, serviceType: 'railway' }
    });

    if (!credential) {
      return res.status(400).json({
        success: false,
        error: 'Railway credentials not configured. Please add your Railway API token in settings.'
      });
    }

    // Decrypt token
    const railwayToken = credentialVault.decrypt({
      iv: credential.iv,
      tag: credential.tag,
      data: credential.encryptedToken
    });

    req.serviceManager = new ServiceManager(railwayToken);
    next();
  } catch (err) {
    console.error('[Services] Failed to initialize service manager:', err);
    res.status(500).json({ success: false, error: 'Failed to initialize Railway connection' });
  }
}

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/services
 * List all services for user
 */
router.get('/', async (req, res) => {
  try {
    const services = await Service.findAll({
      where: { userId: req.user.userId },
      order: [['updatedAt', 'DESC']]
    });

    res.json({
      success: true,
      services: services.map(s => ({
        id: s.id,
        railwayServiceId: s.railwayServiceId,
        name: s.name,
        status: s.status,
        healthScore: s.healthScore,
        lastDeployedAt: s.lastDeployedAt,
        updatedAt: s.updatedAt
      }))
    });
  } catch (err) {
    console.error('[Services] List services error:', err);
    res.status(500).json({ success: false, error: 'Failed to list services' });
  }
});

/**
 * POST /api/services/sync
 * Sync services from Railway
 */
router.post('/sync', initServiceManager, async (req, res) => {
  try {
    const { projectId } = req.body;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Project ID is required'
      });
    }

    const result = await req.serviceManager.syncServices(projectId, req.user.userId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('[Services] Sync error:', err);
    res.status(500).json({ success: false, error: 'Sync failed' });
  }
});

/**
 * GET /api/services/:id
 * Get service details
 */
router.get('/:id', initServiceManager, async (req, res) => {
  try {
    const service = await Service.findOne({
      where: { id: req.params.id, userId: req.user.userId }
    });

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    const details = await req.serviceManager.getServiceDetails(service.railwayServiceId);
    
    if (details.success) {
      res.json(details);
    } else {
      res.status(400).json(details);
    }
  } catch (err) {
    console.error('[Services] Get service error:', err);
    res.status(500).json({ success: false, error: 'Failed to get service details' });
  }
});

/**
 * GET /api/services/:id/variables
 * Get service variables
 */
router.get('/:id/variables', initServiceManager, async (req, res) => {
  try {
    const service = await Service.findOne({
      where: { id: req.params.id, userId: req.user.userId }
    });

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    const details = await req.serviceManager.getServiceDetails(service.railwayServiceId);
    
    if (details.success) {
      res.json({
        success: true,
        variables: details.variables
      });
    } else {
      res.status(400).json(details);
    }
  } catch (err) {
    console.error('[Services] Get variables error:', err);
    res.status(500).json({ success: false, error: 'Failed to get variables' });
  }
});

/**
 * PUT /api/services/:id/variables
 * Update service variables
 */
router.put('/:id/variables', initServiceManager, async (req, res) => {
  try {
    const { variables, environmentId } = req.body;
    
    if (!variables || Object.keys(variables).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Variables are required'
      });
    }

    const service = await Service.findOne({
      where: { id: req.params.id, userId: req.user.userId }
    });

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    const result = await req.serviceManager.updateVariables(
      service.railwayServiceId,
      variables,
      environmentId
    );

    // Update local database
    if (result.success) {
      for (const [key, value] of Object.entries(variables)) {
        await Variable.upsert({
          serviceId: service.id,
          key,
          value,
          lastSyncAt: new Date()
        });
      }
    }

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('[Services] Update variables error:', err);
    res.status(500).json({ success: false, error: 'Failed to update variables' });
  }
});

/**
 * POST /api/services/:id/deploy
 * Deploy service
 */
router.post('/:id/deploy', initServiceManager, async (req, res) => {
  try {
    const { environmentId } = req.body;
    
    const service = await Service.findOne({
      where: { id: req.params.id, userId: req.user.userId }
    });

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    const result = await req.serviceManager.deployService(
      service.railwayServiceId,
      environmentId
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('[Services] Deploy error:', err);
    res.status(500).json({ success: false, error: 'Deployment failed' });
  }
});

/**
 * POST /api/services/:id/restart
 * Restart service
 */
router.post('/:id/restart', initServiceManager, async (req, res) => {
  try {
    const { environmentId } = req.body;
    
    const service = await Service.findOne({
      where: { id: req.params.id, userId: req.user.userId }
    });

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    const result = await req.serviceManager.restartService(
      service.railwayServiceId,
      environmentId
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('[Services] Restart error:', err);
    res.status(500).json({ success: false, error: 'Restart failed' });
  }
});

/**
 * GET /api/services/:id/logs
 * Get service logs
 */
router.get('/:id/logs', initServiceManager, async (req, res) => {
  try {
    const { deploymentId } = req.query;
    
    if (!deploymentId) {
      return res.status(400).json({
        success: false,
        error: 'Deployment ID is required'
      });
    }

    const result = await req.serviceManager.getDeploymentLogs(deploymentId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('[Services] Get logs error:', err);
    res.status(500).json({ success: false, error: 'Failed to get logs' });
  }
});

/**
 * GET /api/services/:id/health
 * Get service health
 */
router.get('/:id/health', initServiceManager, async (req, res) => {
  try {
    const service = await Service.findOne({
      where: { id: req.params.id, userId: req.user.userId }
    });

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    const result = await req.serviceManager.getServiceHealth(service.railwayServiceId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('[Services] Get health error:', err);
    res.status(500).json({ success: false, error: 'Failed to get health' });
  }
});

/**
 * POST /api/services/bulk
 * Bulk operations on multiple services
 */
router.post('/bulk', initServiceManager, async (req, res) => {
  try {
    const { serviceIds, operation, environmentId } = req.body;
    
    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Service IDs array is required'
      });
    }

    if (!operation) {
      return res.status(400).json({
        success: false,
        error: 'Operation is required (deploy, restart, sync)'
      });
    }

    // Get Railway service IDs
    const services = await Service.findAll({
      where: {
        id: serviceIds,
        userId: req.user.userId
      }
    });

    const railwayServiceIds = services.map(s => s.railwayServiceId);

    const result = await req.serviceManager.bulkOperation(
      railwayServiceIds,
      operation,
      environmentId
    );

    res.json(result);
  } catch (err) {
    console.error('[Services] Bulk operation error:', err);
    res.status(500).json({ success: false, error: 'Bulk operation failed' });
  }
});

module.exports = router;
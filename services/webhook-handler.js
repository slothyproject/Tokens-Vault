/**
 * webhook-handler.js - Railway Webhook Handlers
 * Receive and process events from Railway
 */

const AutomationEngine = require('./automation-engine');

class WebhookHandler {
  constructor(serviceManager, websocketServer) {
    this.serviceManager = serviceManager;
    this.wsServer = websocketServer;
    this.automation = new AutomationEngine(serviceManager, this);
  }

  /**
   * Handle deployment webhook from Railway
   */
  async handleDeployment(req, res) {
    try {
      const { 
        serviceId, 
        deploymentId, 
        status, 
        commitHash, 
        commitMessage,
        error 
      } = req.body;

      console.log(`[Webhook] Deployment update: ${serviceId} -> ${status}`);

      // Update deployment in database
      await this.updateDeploymentStatus(deploymentId, status, error);

      // Broadcast to connected clients
      this.wsServer.broadcastDeployment(serviceId, {
        deploymentId,
        status,
        commitHash,
        commitMessage,
        error,
        timestamp: new Date().toISOString()
      });

      // Trigger automation rules
      await this.automation.checkServiceByRailwayId(serviceId);

      res.json({ received: true, processed: true });
    } catch (err) {
      console.error('[Webhook] Deployment handler error:', err);
      res.status(500).json({ received: true, error: err.message });
    }
  }

  /**
   * Handle service health webhook
   */
  async handleHealth(req, res) {
    try {
      const { serviceId, status, health, metrics } = req.body;

      console.log(`[Webhook] Health update: ${serviceId} -> ${status}`);

      // Update service in database
      await this.updateServiceHealth(serviceId, status, health, metrics);

      // Broadcast to connected clients
      this.wsServer.broadcastHealth(serviceId, {
        status,
        health,
        metrics,
        timestamp: new Date().toISOString()
      });

      res.json({ received: true, processed: true });
    } catch (err) {
      console.error('[Webhook] Health handler error:', err);
      res.status(500).json({ received: true, error: err.message });
    }
  }

  /**
   * Handle variable change webhook
   */
  async handleVariables(req, res) {
    try {
      const { serviceId, variables, changedBy } = req.body;

      console.log(`[Webhook] Variables updated: ${serviceId}`);

      // Update variables in database
      await this.updateServiceVariables(serviceId, variables);

      // Broadcast to connected clients
      this.wsServer.broadcastVariables(serviceId, {
        variables,
        changedBy,
        timestamp: new Date().toISOString()
      });

      res.json({ received: true, processed: true });
    } catch (err) {
      console.error('[Webhook] Variables handler error:', err);
      res.status(500).json({ received: true, error: err.message });
    }
  }

  /**
   * Verify webhook signature
   */
  verifySignature(req) {
    const signature = req.headers['x-railway-signature'];
    const secret = process.env.RAILWAY_WEBHOOK_SECRET;
    
    if (!signature || !secret) {
      return false;
    }

    // Verify HMAC signature
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }

  // Database update helpers...
  async updateDeploymentStatus(deploymentId, status, error) {
    // Update deployment record
    console.log(`[Webhook] Updating deployment ${deploymentId} to ${status}`);
  }

  async updateServiceHealth(serviceId, status, health, metrics) {
    // Update service record
    console.log(`[Webhook] Updating service ${serviceId} health`);
  }

  async updateServiceVariables(serviceId, variables) {
    // Update variables
    console.log(`[Webhook] Updating service ${serviceId} variables`);
  }
}

module.exports = WebhookHandler;

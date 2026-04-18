/**
 * automation-engine.js - Service Automation Engine
 * Auto-healing, auto-scaling, and intelligent automation
 */

const { Service, Deployment, AuditLog } = require('../database/models');

class AutomationEngine {
  constructor(serviceManager, notificationService) {
    this.serviceManager = serviceManager;
    this.notificationService = notificationService;
    this.rules = new Map();
    this.running = false;
    this.checkInterval = null;
    
    this.loadDefaultRules();
    console.log('[AutomationEngine] Initialized with default rules');
  }

  /**
   * Load default automation rules
   */
  loadDefaultRules() {
    // Rule 1: Auto-restart crashed services
    this.addRule({
      id: 'auto-restart-crashed',
      name: 'Auto-restart crashed services',
      trigger: {
        type: 'status',
        condition: 'eq',
        value: 'CRASHED'
      },
      action: async (service) => {
        console.log(`[Automation] Service ${service.name} crashed, restarting...`);
        
        // Check recent restarts to prevent restart loops
        const recentRestarts = await this.getRecentRestarts(service.id, 5); // 5 minutes
        if (recentRestarts >= 3) {
          await this.notificationService.sendAlert({
            service: service.name,
            message: `Service keeps crashing after 3 restart attempts`,
            severity: 'critical',
            action: 'manual_investigation_required'
          });
          return { action: 'escalated', reason: 'Too many restarts' };
        }
        
        // Perform restart
        const result = await this.serviceManager.restartService(
          service.railwayServiceId,
          service.environmentId
        );
        
        if (result.success) {
          await this.logAction(service.id, 'auto_restart', 'Service was crashed, auto-restarted');
          return { action: 'restarted', attempts: recentRestarts + 1 };
        } else {
          return { action: 'failed', error: result.error };
        }
      },
      cooldown: 60000, // 1 minute cooldown
      enabled: true
    });

    // Rule 2: Alert on high memory (suggest scaling)
    this.addRule({
      id: 'high-memory-alert',
      name: 'High memory usage alert',
      trigger: {
        type: 'metric',
        metric: 'memory',
        condition: 'gt',
        value: 90,
        duration: 300000 // 5 minutes
      },
      action: async (service, metrics) => {
        console.log(`[Automation] Service ${service.name} has high memory: ${metrics.memory}%`);
        
        await this.notificationService.sendAlert({
          service: service.name,
          message: `Memory usage at ${metrics.memory}%. Consider upgrading plan.`,
          severity: 'warning',
          suggestion: 'scale_up',
          currentPlan: service.plan,
          recommendedPlan: this.getRecommendedPlan(service.plan)
        });
        
        await this.logAction(service.id, 'high_memory_alert', `Memory at ${metrics.memory}%`);
        
        return { action: 'notified', suggestion: 'scale_up' };
      },
      cooldown: 900000, // 15 minutes between alerts
      enabled: true
    });

    // Rule 3: Alert on high CPU
    this.addRule({
      id: 'high-cpu-alert',
      name: 'High CPU usage alert',
      trigger: {
        type: 'metric',
        metric: 'cpu',
        condition: 'gt',
        value: 85,
        duration: 600000 // 10 minutes
      },
      action: async (service, metrics) => {
        console.log(`[Automation] Service ${service.name} has high CPU: ${metrics.cpu}%`);
        
        await this.notificationService.sendAlert({
          service: service.name,
          message: `CPU usage consistently high at ${metrics.cpu}%`,
          severity: 'warning',
          suggestion: 'investigate'
        });
        
        await this.logAction(service.id, 'high_cpu_alert', `CPU at ${metrics.cpu}%`);
        
        return { action: 'notified' };
      },
      cooldown: 900000,
      enabled: true
    });

    // Rule 4: Deployment failure alert
    this.addRule({
      id: 'deploy-failure-alert',
      name: 'Deployment failure notification',
      trigger: {
        type: 'deployment',
        status: 'FAILED'
      },
      action: async (service, deployment) => {
        console.log(`[Automation] Deployment failed for ${service.name}`);
        
        await this.notificationService.sendAlert({
          service: service.name,
          message: `Deployment failed: ${deployment.error || 'Unknown error'}`,
          severity: 'error',
          deploymentId: deployment.id,
          action: 'view_logs'
        });
        
        await this.logAction(service.id, 'deploy_failed', deployment.error || 'Unknown error');
        
        return { action: 'notified' };
      },
      cooldown: 0, // No cooldown for failures
      enabled: true
    });

    // Rule 5: SSL expiry warning
    this.addRule({
      id: 'ssl-expiry-warning',
      name: 'SSL certificate expiry warning',
      trigger: {
        type: 'ssl',
        daysUntilExpiry: 7
      },
      action: async (service) => {
        console.log(`[Automation] SSL expiring soon for ${service.name}`);
        
        await this.notificationService.sendAlert({
          service: service.name,
          message: `SSL certificate expires in 7 days`,
          severity: 'warning',
          action: 'renew_ssl'
        });
        
        await this.logAction(service.id, 'ssl_expiry_warning', 'SSL expires in 7 days');
        
        return { action: 'notified' };
      },
      cooldown: 86400000, // 24 hours
      enabled: true
    });
  }

  /**
   * Add automation rule
   */
  addRule(rule) {
    this.rules.set(rule.id, {
      ...rule,
      lastTriggered: null,
      triggerCount: 0
    });
  }

  /**
   * Start automation engine
   */
  start() {
    if (this.running) return;
    
    this.running = true;
    console.log('[AutomationEngine] Started');
    
    // Check every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkAllServices();
    }, 30000);
  }

  /**
   * Stop automation engine
   */
  stop() {
    this.running = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    console.log('[AutomationEngine] Stopped');
  }

  /**
   * Check all services against rules
   */
  async checkAllServices() {
    try {
      const services = await Service.findAll({
        where: { isActive: true }
      });
      
      for (const service of services) {
        await this.checkService(service);
      }
    } catch (err) {
      console.error('[AutomationEngine] Check failed:', err);
    }
  }

  /**
   * Check single service against all rules
   */
  async checkService(service) {
    // Get current status from Railway
    const status = await this.serviceManager.getServiceHealth(service.railwayServiceId);
    
    if (!status.success) {
      console.warn(`[AutomationEngine] Failed to get status for ${service.name}`);
      return;
    }

    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled) continue;
      
      // Check cooldown
      if (this.isInCooldown(rule)) continue;
      
      // Evaluate trigger
      const shouldTrigger = await this.evaluateTrigger(rule.trigger, service, status);
      
      if (shouldTrigger) {
        console.log(`[AutomationEngine] Rule ${ruleId} triggered for ${service.name}`);
        
        try {
          const result = await rule.action(service, status);
          
          // Update rule stats
          rule.lastTriggered = Date.now();
          rule.triggerCount++;
          
          console.log(`[AutomationEngine] Rule ${ruleId} executed:`, result);
        } catch (err) {
          console.error(`[AutomationEngine] Rule ${ruleId} failed:`, err);
        }
      }
    }
  }

  /**
   * Evaluate if trigger condition is met
   */
  async evaluateTrigger(trigger, service, metrics) {
    switch (trigger.type) {
      case 'status':
        return this.compare(metrics.status, trigger.condition, trigger.value);
        
      case 'metric':
        const value = metrics[trigger.metric];
        if (value === undefined) return false;
        
        // For metrics, we need duration - check if condition held for specified time
        return await this.checkMetricOverTime(
          service.id,
          trigger.metric,
          trigger.condition,
          trigger.value,
          trigger.duration
        );
        
      case 'deployment':
        // Check recent deployments
        const recentDeploys = await this.getRecentDeployments(service.id, 5);
        return recentDeploys.some(d => d.status === trigger.status);
        
      case 'ssl':
        // Check SSL expiry
        const sslInfo = await this.getSSLInfo(service);
        return sslInfo.daysUntilExpiry <= trigger.daysUntilExpiry;
        
      default:
        return false;
    }
  }

  /**
   * Compare values
   */
  compare(value, condition, target) {
    switch (condition) {
      case 'eq': return value === target;
      case 'ne': return value !== target;
      case 'gt': return value > target;
      case 'gte': return value >= target;
      case 'lt': return value < target;
      case 'lte': return value <= target;
      default: return false;
    }
  }

  /**
   * Check if rule is in cooldown
   */
  isInCooldown(rule) {
    if (!rule.lastTriggered || !rule.cooldown) return false;
    return Date.now() - rule.lastTriggered < rule.cooldown;
  }

  /**
   * Get recent restart count
   */
  async getRecentRestarts(serviceId, minutes) {
    const since = new Date(Date.now() - minutes * 60000);
    const actions = await AuditLog.findAll({
      where: {
        serviceId,
        action: 'auto_restart',
        createdAt: { $gte: since }
      }
    });
    return actions.length;
  }

  /**
   * Get recent deployments
   */
  async getRecentDeployments(serviceId, limit) {
    return await Deployment.findAll({
      where: { serviceId },
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  /**
   * Check metric over time
   */
  async checkMetricOverTime(serviceId, metric, condition, value, duration) {
    // This would check if the metric condition held for the specified duration
    // Simplified implementation - in production, query time-series database
    return true; // Placeholder
  }

  /**
   * Get SSL info for service
   */
  async getSSLInfo(service) {
    // This would check SSL certificate expiry
    // Placeholder
    return { daysUntilExpiry: 30 };
  }

  /**
   * Get recommended plan for scaling
   */
  getRecommendedPlan(currentPlan) {
    const plans = ['starter', 'developer', 'pro', 'enterprise'];
    const currentIndex = plans.indexOf(currentPlan);
    return currentIndex < plans.length - 1 ? plans[currentIndex + 1] : currentPlan;
  }

  /**
   * Log automation action
   */
  async logAction(serviceId, action, details) {
    await AuditLog.create({
      serviceId,
      action: `automation_${action}`,
      details,
      severity: 'info'
    });
  }
}

module.exports = AutomationEngine;

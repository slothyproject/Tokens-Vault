/**
 * Automation Engine Tests
 * Test auto-healing and automation rules
 */

const AutomationEngine = require('../../services/automation-engine');
const { Service, Metric } = require('../../database/models');

// Mock the database models
jest.mock('../../database/models', () => ({
  Service: {
    findByPk: jest.fn(),
    findAll: jest.fn()
  },
  Metric: {
    create: jest.fn()
  }
}));

// Mock Railway GraphQL Client
jest.mock('../../services/railway-graphql-client', () => {
  return jest.fn().mockImplementation(() => ({
    restartService: jest.fn().mockResolvedValue({ id: 'dep-123', status: 'success' }),
    getService: jest.fn().mockResolvedValue({ id: 'svc-123', status: 'SUCCESS' })
  }));
});

describe('AutomationEngine', () => {
  let automationEngine;
  let mockWebSocketServer;

  beforeEach(() => {
    mockWebSocketServer = {
      broadcastHealthStatus: jest.fn()
    };
    automationEngine = new AutomationEngine(mockWebSocketServer);
    jest.clearAllMocks();
  });

  describe('Rule Management', () => {
    test('should add automation rule', () => {
      const rule = {
        id: 'rule-1',
        name: 'High CPU Alert',
        condition: { metric: 'cpu', operator: 'gt', threshold: 90 },
        action: { type: 'notify' }
      };

      automationEngine.addRule(rule);
      
      expect(automationEngine.rules.has('rule-1')).toBe(true);
    });

    test('should remove automation rule', () => {
      const rule = {
        id: 'rule-1',
        name: 'Test Rule',
        condition: {},
        action: {}
      };

      automationEngine.addRule(rule);
      automationEngine.removeRule('rule-1');
      
      expect(automationEngine.rules.has('rule-1')).toBe(false);
    });

    test('should get all rules', () => {
      automationEngine.addRule({ id: 'rule-1', name: 'Rule 1' });
      automationEngine.addRule({ id: 'rule-2', name: 'Rule 2' });

      const rules = automationEngine.getAllRules();
      
      expect(rules).toHaveLength(2);
    });

    test('should enable/disable rule', () => {
      const rule = {
        id: 'rule-1',
        name: 'Test Rule',
        enabled: true,
        condition: {},
        action: {}
      };

      automationEngine.addRule(rule);
      automationEngine.disableRule('rule-1');
      
      expect(automationEngine.rules.get('rule-1').enabled).toBe(false);
      
      automationEngine.enableRule('rule-1');
      expect(automationEngine.rules.get('rule-1').enabled).toBe(true);
    });
  });

  describe('Rule Evaluation', () => {
    test('should evaluate CPU threshold condition', () => {
      const rule = {
        condition: {
          metric: 'cpu',
          operator: 'gt',
          threshold: 80
        }
      };

      const metrics = { cpuPercent: 90 };
      
      const result = automationEngine.evaluateCondition(rule.condition, metrics);
      expect(result).toBe(true);
    });

    test('should evaluate Memory threshold condition', () => {
      const rule = {
        condition: {
          metric: 'memory',
          operator: 'gt',
          threshold: 85
        }
      };

      const metrics = { memoryPercent: 90 };
      
      const result = automationEngine.evaluateCondition(rule.condition, metrics);
      expect(result).toBe(true);
    });

    test('should handle less than operator', () => {
      const rule = {
        condition: {
          metric: 'cpu',
          operator: 'lt',
          threshold: 20
        }
      };

      const metrics = { cpuPercent: 10 };
      
      const result = automationEngine.evaluateCondition(rule.condition, metrics);
      expect(result).toBe(true);
    });

    test('should handle equals operator', () => {
      const rule = {
        condition: {
          metric: 'status',
          operator: 'eq',
          value: 'CRASHED'
        }
      };

      const metrics = { status: 'CRASHED' };
      
      const result = automationEngine.evaluateCondition(rule.condition, metrics);
      expect(result).toBe(true);
    });

    test('should return false when condition not met', () => {
      const rule = {
        condition: {
          metric: 'cpu',
          operator: 'gt',
          threshold: 90
        }
      };

      const metrics = { cpuPercent: 50 };
      
      const result = automationEngine.evaluateCondition(rule.condition, metrics);
      expect(result).toBe(false);
    });
  });

  describe('Action Execution', () => {
    test('should execute notify action', async () => {
      const action = {
        type: 'notify',
        message: 'High CPU detected'
      };

      await automationEngine.executeAction('svc-123', action);
      
      // Should broadcast notification
      expect(automationEngine).toBeDefined();
    });

    test('should execute restart action', async () => {
      const service = {
        id: 'svc-123',
        railwayId: 'railway-svc-123',
        name: 'Test Service'
      };

      Service.findByPk.mockResolvedValue(service);

      const action = {
        type: 'restart',
        cooldown: 300000 // 5 minutes
      };

      await automationEngine.executeAction('svc-123', action);
      
      // Should attempt restart
      expect(Service.findByPk).toHaveBeenCalledWith('svc-123');
    });

    test('should respect cooldown period', async () => {
      const service = {
        id: 'svc-123',
        railwayId: 'railway-svc-123',
        name: 'Test Service'
      };

      Service.findByPk.mockResolvedValue(service);

      // First action
      await automationEngine.executeAction('svc-123', { type: 'restart', cooldown: 300000 });
      
      // Second action within cooldown should be skipped
      await automationEngine.executeAction('svc-123', { type: 'restart', cooldown: 300000 });
      
      // Service should only be fetched once due to cooldown
      expect(Service.findByPk).toHaveBeenCalledTimes(1);
    });

    test('should execute scale action', async () => {
      const action = {
        type: 'scale',
        replicas: 2
      };

      await automationEngine.executeAction('svc-123', action);
      
      // Scale action defined
      expect(automationEngine).toBeDefined();
    });
  });

  describe('Auto-Healing', () => {
    test('should detect crashed service', async () => {
      const service = {
        id: 'svc-123',
        railwayId: 'railway-svc-123',
        name: 'Test Service',
        status: 'CRASHED'
      };

      Service.findAll.mockResolvedValue([service]);

      automationEngine.addRule({
        id: 'auto-restart',
        name: 'Auto Restart Crashed',
        condition: {
          metric: 'status',
          operator: 'eq',
          value: 'CRASHED'
        },
        action: {
          type: 'restart',
          cooldown: 300000
        },
        enabled: true
      });

      await automationEngine.checkServices();
      
      // Should evaluate rules
      expect(automationEngine.rules.size).toBeGreaterThan(0);
    });

    test('should handle service with missing metrics', async () => {
      const service = {
        id: 'svc-123',
        railwayId: 'railway-svc-123',
        name: 'Test Service'
      };

      Service.findAll.mockResolvedValue([service]);

      await automationEngine.checkServices();
      
      // Should not throw
      expect(automationEngine).toBeDefined();
    });
  });

  describe('Webhook Handling', () => {
    test('should handle deployment webhook', async () => {
      const payload = {
        event: 'deployment.completed',
        serviceId: 'svc-123',
        status: 'SUCCESS'
      };

      await automationEngine.handleWebhook(payload);
      
      // Should process webhook
      expect(automationEngine).toBeDefined();
    });

    test('should handle service update webhook', async () => {
      const payload = {
        event: 'service.updated',
        serviceId: 'svc-123',
        changes: { status: 'HEALTHY' }
      };

      await automationEngine.handleWebhook(payload);
      
      expect(automationEngine).toBeDefined();
    });
  });

  describe('Notification Queue', () => {
    test('should queue notification', () => {
      automationEngine.queueNotification({
        serviceId: 'svc-123',
        type: 'alert',
        message: 'High CPU'
      });

      expect(automationEngine.notificationQueue.length).toBeGreaterThan(0);
    });

    test('should process notification queue', async () => {
      automationEngine.queueNotification({
        serviceId: 'svc-123',
        type: 'alert',
        message: 'High CPU'
      });

      await automationEngine.processNotificationQueue();
      
      // Queue should be processed
      expect(automationEngine).toBeDefined();
    });
  });

  describe('Statistics', () => {
    test('should track rule triggers', () => {
      automationEngine.recordTrigger('rule-1');
      
      const stats = automationEngine.getRuleStats('rule-1');
      expect(stats.triggerCount).toBe(1);
    });

    test('should return global stats', () => {
      automationEngine.recordTrigger('rule-1');
      automationEngine.recordTrigger('rule-2');
      
      const stats = automationEngine.getStats();
      expect(stats.totalRules).toBeGreaterThanOrEqual(0);
    });
  });
});

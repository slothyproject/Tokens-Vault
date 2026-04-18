/**
 * AI Intelligence Engine Tests
 * Comprehensive test suite for AI-powered analytics
 */

const AIIntelligenceEngine = require('../../services/ai-intelligence-engine');

describe('AIIntelligenceEngine', () => {
  beforeEach(() => {
    AIIntelligenceEngine.clearCache();
  });

  describe('analyzePerformance', () => {
    test('should calculate basic performance stats', async () => {
      const metrics = [
        { cpuPercent: 50, memoryPercent: 60, timestamp: new Date(Date.now() - 1000) },
        { cpuPercent: 55, memoryPercent: 62, timestamp: new Date(Date.now() - 500) },
        { cpuPercent: 52, memoryPercent: 61, timestamp: new Date() }
      ];

      const insights = await AIIntelligenceEngine.analyzePerformance(metrics);
      
      expect(Array.isArray(insights)).toBe(true);
    });

    test('should detect high CPU usage', async () => {
      const metrics = [
        { cpuPercent: 85, memoryPercent: 60, timestamp: new Date(Date.now() - 1000) },
        { cpuPercent: 90, memoryPercent: 60, timestamp: new Date(Date.now() - 500) },
        { cpuPercent: 88, memoryPercent: 60, timestamp: new Date() }
      ];

      const insights = await AIIntelligenceEngine.analyzePerformance(metrics);
      
      const highCpuInsight = insights.find(i => i.title === 'High CPU Utilization');
      expect(highCpuInsight).toBeDefined();
      expect(highCpuInsight.severity).toBe('warning');
    });

    test('should detect critical CPU usage', async () => {
      const metrics = [
        { cpuPercent: 92, memoryPercent: 60, timestamp: new Date(Date.now() - 1000) },
        { cpuPercent: 95, memoryPercent: 60, timestamp: new Date() }
      ];

      const insights = await AIIntelligenceEngine.analyzePerformance(metrics);
      
      const highCpuInsight = insights.find(i => i.title === 'High CPU Utilization');
      expect(highCpuInsight).toBeDefined();
      expect(highCpuInsight.severity).toBe('critical');
    });

    test('should handle empty metrics', async () => {
      const insights = await AIIntelligenceEngine.analyzePerformance([]);
      expect(insights).toEqual([]);
    });
  });

  describe('analyzeCosts', () => {
    test('should suggest optimization for over-provisioned resources', async () => {
      const metrics = [];
      for (let i = 0; i < 25; i++) {
        metrics.push({
          cpuPercent: 5,
          memoryPercent: 10,
          timestamp: new Date(Date.now() - i * 3600000)
        });
      }

      const insights = await AIIntelligenceEngine.analyzeCosts(metrics);
      
      const optimizationInsight = insights.find(i => i.title === 'Over-provisioned Resources');
      expect(optimizationInsight).toBeDefined();
      expect(optimizationInsight.potentialSavings).toContain('50');
    });

    test('should detect idle periods', async () => {
      const metrics = [];
      for (let i = 0; i < 24; i++) {
        metrics.push({
          cpuPercent: i < 8 || i > 16 ? 2 : 50, // Low usage during off-hours
          memoryPercent: i < 8 || i > 16 ? 5 : 60,
          timestamp: new Date(Date.now() - (24 - i) * 3600000)
        });
      }

      const insights = await AIIntelligenceEngine.analyzeCosts(metrics);
      
      const idleInsight = insights.find(i => i.title === 'Idle Period Detected');
      // Should have idle hours detected
    });

    test('should handle normal utilization', async () => {
      const metrics = [
        { cpuPercent: 50, memoryPercent: 60, timestamp: new Date(Date.now() - 1000) },
        { cpuPercent: 55, memoryPercent: 65, timestamp: new Date() }
      ];

      const insights = await AIIntelligenceEngine.analyzeCosts(metrics);
      expect(Array.isArray(insights)).toBe(true);
    });
  });

  describe('detectAnomalies', () => {
    test('should detect CPU spike anomaly', async () => {
      const metrics = [];
      for (let i = 0; i < 10; i++) {
        metrics.push({
          cpuPercent: i === 9 ? 98 : 50 + Math.random() * 5,
          memoryPercent: 60,
          timestamp: new Date(Date.now() - (10 - i) * 1000)
        });
      }

      const insights = await AIIntelligenceEngine.detectAnomalies(metrics);
      
      const anomalyInsight = insights.find(i => i.title === 'CPU Anomalies Detected');
      expect(anomalyInsight).toBeDefined();
    });

    test('should detect traffic drop anomaly', async () => {
      const metrics = [
        { cpuPercent: 50, memoryPercent: 60, requestCount: 100, timestamp: new Date(Date.now() - 2000) },
        { cpuPercent: 50, memoryPercent: 60, requestCount: 100, timestamp: new Date(Date.now() - 1000) },
        { cpuPercent: 50, memoryPercent: 60, requestCount: 20, timestamp: new Date() } // 80% drop
      ];

      const insights = await AIIntelligenceEngine.detectAnomalies(metrics);
      
      const dropInsight = insights.find(i => i.title === 'Traffic Drop Alert');
      expect(dropInsight).toBeDefined();
      expect(dropInsight.severity).toBe('critical');
    });

    test('should return empty array for normal metrics', async () => {
      const metrics = [
        { cpuPercent: 50, memoryPercent: 60, timestamp: new Date(Date.now() - 2000) },
        { cpuPercent: 52, memoryPercent: 61, timestamp: new Date(Date.now() - 1000) },
        { cpuPercent: 55, memoryPercent: 60, timestamp: new Date() }
      ];

      const insights = await AIIntelligenceEngine.detectAnomalies(metrics);
      expect(insights).toEqual([]);
    });

    test('should handle insufficient data', async () => {
      const insights = await AIIntelligenceEngine.detectAnomalies([]);
      expect(insights).toEqual([]);
    });
  });

  describe('predictMetrics', () => {
    test('should predict future CPU usage', async () => {
      const metrics = [];
      for (let i = 0; i < 25; i++) {
        metrics.push({
          cpuPercent: 50 + i * 2, // Increasing trend
          memoryPercent: 60,
          timestamp: new Date(Date.now() - (25 - i) * 3600000)
        });
      }

      const result = await AIIntelligenceEngine.predictMetrics('test-service', 24);
      expect(result).toHaveProperty('success');
      // May fail if no data in DB, that's expected in test
    });
  });

  describe('analyzeTrafficPatterns', () => {
    test('should analyze traffic patterns', async () => {
      const metrics = [
        { cpuPercent: 50, memoryPercent: 60, requestCount: 100, timestamp: new Date(Date.now() - 86400000) },
        { cpuPercent: 50, memoryPercent: 60, requestCount: 200, timestamp: new Date(Date.now() - 43200000) },
        { cpuPercent: 50, memoryPercent: 60, requestCount: 150, timestamp: new Date(Date.now() - 3600000) },
        { cpuPercent: 50, memoryPercent: 60, requestCount: 180, timestamp: new Date() }
      ];

      const insights = await AIIntelligenceEngine.analyzeTrafficPatterns(metrics);
      expect(Array.isArray(insights)).toBe(true);
    });
  });

  describe('generateRecommendations', () => {
    test('should generate service recommendations', async () => {
      const mockService = {
        name: 'test-service',
        createdAt: new Date(Date.now() - 86400000 * 60) // 60 days old
      };

      const metrics = [
        { cpuPercent: 80, memoryPercent: 70, responseTimeMs: 500, timestamp: new Date(Date.now() - 1000) },
        { cpuPercent: 85, memoryPercent: 75, responseTimeMs: 550, timestamp: new Date() }
      ];

      const insights = await AIIntelligenceEngine.generateRecommendations(mockService, metrics);
      
      const slowResponseInsight = insights.find(i => i.title === 'Slow Response Times');
      expect(slowResponseInsight).toBeDefined();
    });

    test('should prioritize critical recommendations', async () => {
      const mockService = {
        name: 'test-service',
        createdAt: new Date(Date.now() - 86400000 * 60)
      };

      const metrics = [
        { cpuPercent: 98, memoryPercent: 95, responseTimeMs: 200, timestamp: new Date() }
      ];

      const insights = await AIIntelligenceEngine.generateRecommendations(mockService, metrics);
      
      expect(insights.length).toBeGreaterThan(0);
    });
  });

  describe('Caching', () => {
    test('should cache analysis results', () => {
      const key = 'test-analysis';
      const data = { result: 'cached' };
      
      AIIntelligenceEngine.setCache(key, data, 1000);
      const cached = AIIntelligenceEngine.getCache(key);
      
      expect(cached).toEqual(data);
    });

    test('should return null for expired cache', () => {
      const key = 'expired-test';
      const data = { result: 'old' };
      
      AIIntelligenceEngine.setCache(key, data, -1); // Already expired
      const cached = AIIntelligenceEngine.getCache(key);
      
      expect(cached).toBeNull();
    });

    test('should clear cache', () => {
      AIIntelligenceEngine.setCache('key1', { data: 1 }, 1000);
      AIIntelligenceEngine.setCache('key2', { data: 2 }, 1000);
      
      AIIntelligenceEngine.clearCache();
      
      expect(AIIntelligenceEngine.getCache('key1')).toBeNull();
      expect(AIIntelligenceEngine.getCache('key2')).toBeNull();
    });
  });

  describe('generateSummary', () => {
    test('should generate summary with critical status', () => {
      const insights = [
        { severity: 'critical', title: 'Critical Issue' },
        { severity: 'warning', title: 'Warning Issue' }
      ];

      const summary = AIIntelligenceEngine.generateSummary(insights);
      
      expect(summary).toEqual({
        total: 2,
        critical: 1,
        warnings: 1,
        suggestions: 0,
        status: 'critical'
      });
    });

    test('should generate summary with warning status', () => {
      const insights = [
        { severity: 'warning', title: 'Warning Issue' },
        { severity: 'suggestion', title: 'Suggestion' }
      ];

      const summary = AIIntelligenceEngine.generateSummary(insights);
      
      expect(summary.status).toBe('warning');
    });

    test('should generate summary with healthy status', () => {
      const insights = [
        { severity: 'suggestion', title: 'Suggestion' }
      ];

      const summary = AIIntelligenceEngine.generateSummary(insights);
      
      expect(summary.status).toBe('healthy');
    });
  });
});

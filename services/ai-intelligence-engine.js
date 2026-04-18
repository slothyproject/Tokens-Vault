/**
 * ai-intelligence-engine.js - AI Intelligence Engine
 * Smart insights, predictions, and recommendations
 */

const ss = require('simple-statistics');
const { Service, Metric, Deployment } = require('../database/models');

class AIIntelligenceEngine {
  constructor() {
    this.insightsCache = new Map();
    this.predictionModels = new Map();
  }

  /**
   * Analyze service and generate insights
   */
  async analyzeService(serviceId) {
    console.log(`[AI] Analyzing service ${serviceId}`);
    
    try {
      // Get service data
      const service = await Service.findByPk(serviceId);
      if (!service) {
        return { success: false, error: 'Service not found' };
      }

      // Get metrics history
      const metrics = await this.getMetricsHistory(serviceId, 7); // 7 days
      
      // Get deployment history
      const deployments = await this.getDeploymentHistory(serviceId, 30); // 30 days

      const insights = [];

      // Generate various insights
      insights.push(...await this.analyzePerformance(metrics));
      insights.push(...await this.analyzeCosts(metrics));
      insights.push(...await this.analyzeReliability(deployments));
      insights.push(...await this.analyzeTrafficPatterns(metrics));
      insights.push(...await this.detectAnomalies(metrics));
      insights.push(...await this.generateRecommendations(service, metrics));

      // Cache insights
      this.insightsCache.set(serviceId, {
        insights,
        generatedAt: new Date()
      });

      return {
        success: true,
        service: service.name,
        insights,
        summary: this.generateSummary(insights)
      };
    } catch (err) {
      console.error('[AI] Analysis failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Analyze performance metrics
   */
  async analyzePerformance(metrics) {
    const insights = [];
    
    if (metrics.length < 3) {
      return insights; // Not enough data
    }

    const cpuValues = metrics.map(m => m.cpuPercent).filter(v => v != null);
    const memoryValues = metrics.map(m => m.memoryPercent).filter(v => v != null);

    if (cpuValues.length > 0) {
      const avgCpu = ss.mean(cpuValues);
      const maxCpu = ss.max(cpuValues);
      
      // CPU Trend
      if (cpuValues.length >= 7) {
        const recent = cpuValues.slice(-7);
        const previous = cpuValues.slice(-14, -7);
        
        if (recent.length > 0 && previous.length > 0) {
          const recentAvg = ss.mean(recent);
          const previousAvg = ss.mean(previous);
          const change = ((recentAvg - previousAvg) / previousAvg) * 100;
          
          if (change > 20) {
            insights.push({
              type: 'performance',
              severity: 'warning',
              title: 'CPU Usage Trending Up',
              message: `CPU usage increased ${change.toFixed(1)}% over last week`,
              recommendation: 'Consider investigating recent changes or scaling up',
              metric: 'cpu_trend',
              value: change
            });
          }
        }
      }

      // High CPU Usage
      if (avgCpu > 70) {
        insights.push({
          type: 'performance',
          severity: avgCpu > 85 ? 'critical' : 'warning',
          title: 'High CPU Utilization',
          message: `Average CPU at ${avgCpu.toFixed(1)}% over last 7 days`,
          recommendation: avgCpu > 85 
            ? 'Immediate action recommended: Scale up or optimize code'
            : 'Consider scaling up to improve response times',
          metric: 'cpu_average',
          value: avgCpu
        });
      }
    }

    if (memoryValues.length > 0) {
      const avgMemory = ss.mean(memoryValues);
      
      if (avgMemory > 80) {
        insights.push({
          type: 'performance',
          severity: avgMemory > 90 ? 'critical' : 'warning',
          title: 'High Memory Usage',
          message: `Average memory at ${avgMemory.toFixed(1)}% over last 7 days`,
          recommendation: 'Check for memory leaks or increase memory allocation',
          metric: 'memory_average',
          value: avgMemory
        });
      }
    }

    return insights;
  }

  /**
   * Analyze costs and provide optimization suggestions
   */
  async analyzeCosts(metrics) {
    const insights = [];
    
    if (metrics.length < 24) { // Need at least 24 hours of data
      return insights;
    }

    // Detect idle periods
    const hourlyPatterns = this.analyzeHourlyPatterns(metrics);
    const idleHours = hourlyPatterns.filter(h => h.avgCpu < 5 && h.avgMemory < 10);
    
    if (idleHours.length > 8) { // More than 8 idle hours per day
      insights.push({
        type: 'cost',
        severity: 'suggestion',
        title: 'Idle Period Detected',
        message: `Service appears idle for ${idleHours.length} hours per day`,
        recommendation: 'Consider auto-scaling to zero or scheduled sleeping to reduce costs',
        potentialSavings: '~30-40%',
        metric: 'idle_hours',
        value: idleHours.length
      });
    }

    // Detect consistently low usage
    const avgCpu = ss.mean(metrics.map(m => m.cpuPercent).filter(v => v != null));
    if (avgCpu < 10) {
      insights.push({
        type: 'cost',
        severity: 'suggestion',
        title: 'Over-provisioned Resources',
        message: 'Service consistently using less than 10% CPU',
        recommendation: 'Consider downgrading to a smaller plan',
        potentialSavings: '~50%',
        metric: 'underutilization',
        value: avgCpu
      });
    }

    return insights;
  }

  /**
   * Analyze deployment reliability
   */
  async analyzeReliability(deployments) {
    const insights = [];
    
    if (deployments.length < 5) {
      return insights;
    }

    const total = deployments.length;
    const successful = deployments.filter(d => d.status === 'success').length;
    const failed = deployments.filter(d => d.status === 'failed').length;
    const successRate = (successful / total) * 100;

    if (successRate < 95) {
      insights.push({
        type: 'reliability',
        severity: 'warning',
        title: 'Low Deployment Success Rate',
        message: `Only ${successRate.toFixed(1)}% of deployments succeeded`,
        recommendation: 'Review deployment pipeline and add more pre-deployment checks',
        metric: 'deploy_success_rate',
        value: successRate
      });
    }

    // Check for frequent failures
    if (failed >= 3) {
      const recentFailed = deployments
        .filter(d => d.status === 'failed')
        .slice(0, 3);
      
      insights.push({
        type: 'reliability',
        severity: 'critical',
        title: 'Recent Deployment Failures',
        message: `${failed} failed deployments in last 30 days`,
        recommendation: 'Investigate common failure patterns and fix root causes',
        recentErrors: recentFailed.map(d => d.error || 'Unknown error'),
        metric: 'failed_deploys',
        value: failed
      });
    }

    return insights;
  }

  /**
   * Analyze traffic patterns
   */
  async analyzeTrafficPatterns(metrics) {
    const insights = [];
    
    if (metrics.length < 48) { // Need 2 days minimum
      return insights;
    }

    // Find peak hours
    const hourlyTraffic = this.groupByHour(metrics);
    const peakHours = hourlyTraffic
      .map((h, i) => ({ hour: i, ...h }))
      .sort((a, b) => b.avgRequests - a.avgRequests)
      .slice(0, 3);

    const lowTrafficHours = hourlyTraffic
      .map((h, i) => ({ hour: i, ...h }))
      .sort((a, b) => a.avgRequests - b.avgRequests)
      .slice(0, 3);

    if (peakHours.length > 0) {
      insights.push({
        type: 'traffic',
        severity: 'info',
        title: 'Peak Traffic Hours',
        message: `Highest traffic at ${peakHours.map(h => `${h.hour}:00`).join(', ')}`,
        recommendation: 'Consider pre-scaling 30 minutes before peak hours',
        peakHours: peakHours.map(h => h.hour),
        metric: 'peak_hours'
      });
    }

    // Detect weekend vs weekday patterns
    const weekendVsWeekday = this.compareWeekendWeekday(metrics);
    if (weekendVsWeekday.ratio > 2) {
      insights.push({
        type: 'traffic',
        severity: 'suggestion',
        title: 'Weekday vs Weekend Traffic Disparity',
        message: `Weekday traffic is ${weekendVsWeekday.ratio.toFixed(1)}x higher than weekends`,
        recommendation: 'Consider different scaling strategies for weekdays vs weekends',
        metric: 'weekend_ratio',
        value: weekendVsWeekday.ratio
      });
    }

    return insights;
  }

  /**
   * Detect anomalies in metrics
   */
  async detectAnomalies(metrics) {
    const insights = [];
    
    if (metrics.length < 10) {
      return insights;
    }

    const cpuValues = metrics.map(m => m.cpuPercent).filter(v => v != null);
    
    if (cpuValues.length > 0) {
      const mean = ss.mean(cpuValues);
      const stdDev = ss.standardDeviation(cpuValues);
      
      // Find outliers (more than 3 standard deviations)
      const outliers = cpuValues.filter(v => Math.abs(v - mean) > 3 * stdDev);
      
      if (outliers.length > 0) {
        insights.push({
          type: 'anomaly',
          severity: 'warning',
          title: 'CPU Anomalies Detected',
          message: `${outliers.length} unusual CPU spikes detected`,
          recommendation: 'Investigate causes of CPU spikes',
          metric: 'cpu_outliers',
          value: outliers.length
        });
      }
    }

    // Detect sudden drops in traffic
    const requests = metrics.map(m => m.requestCount).filter(v => v != null);
    if (requests.length > 1) {
      const latest = requests[requests.length - 1];
      const previous = requests[requests.length - 2];
      
      if (previous > 0 && latest / previous < 0.5) {
        insights.push({
          type: 'anomaly',
          severity: 'critical',
          title: 'Traffic Drop Alert',
          message: `Traffic dropped ${((1 - latest/previous) * 100).toFixed(0)}%`,
          recommendation: 'Immediate investigation required - possible outage',
          metric: 'traffic_drop',
          value: latest / previous
        });
      }
    }

    return insights;
  }

  /**
   * Generate actionable recommendations
   */
  async generateRecommendations(service, metrics) {
    const recommendations = [];
    
    // Database connection pool recommendation
    const avgResponseTime = ss.mean(
      metrics.map(m => m.responseTimeMs).filter(v => v != null)
    );
    
    if (avgResponseTime > 500) {
      recommendations.push({
        type: 'recommendation',
        severity: 'suggestion',
        title: 'Slow Response Times',
        message: `Average response time is ${avgResponseTime.toFixed(0)}ms`,
        recommendation: 'Consider increasing database connection pool size or adding caching',
        action: 'increase_db_pool',
        currentValue: avgResponseTime,
        targetValue: '< 200ms'
      });
    }

    // SSL certificate check
    const daysUntilExpiry = await this.getSSLExpiry(service);
    if (daysUntilExpiry < 30) {
      recommendations.push({
        type: 'recommendation',
        severity: daysUntilExpiry < 7 ? 'critical' : 'warning',
        title: 'SSL Certificate Expiring',
        message: `SSL expires in ${daysUntilExpiry} days`,
        recommendation: 'Renew SSL certificate',
        action: 'renew_ssl',
        daysUntilExpiry
      });
    }

    // Security recommendation
    recommendations.push({
      type: 'recommendation',
      severity: 'info',
      title: 'Security Best Practice',
      message: 'Enable request logging for better security monitoring',
      recommendation: 'Add request logging middleware',
      action: 'enable_logging'
    });

    return recommendations;
  }

  /**
   * Predict future metrics
   */
  async predictMetrics(serviceId, hours = 24) {
    try {
      const metrics = await this.getMetricsHistory(serviceId, 7);
      
      if (metrics.length < 24) {
        return { success: false, error: 'Not enough data for prediction' };
      }

      const cpuValues = metrics.map(m => m.cpuPercent).filter(v => v != null);
      
      // Simple linear regression for prediction
      const x = Array.from({ length: cpuValues.length }, (_, i) => i);
      const regression = ss.linearRegression(x.map((xi, i) => [xi, cpuValues[i]]));
      const regressionLine = ss.linearRegressionLine(regression);
      
      // Predict next values
      const predictions = [];
      for (let i = 1; i <= hours; i++) {
        const predictedValue = regressionLine(cpuValues.length + i);
        predictions.push({
          hour: i,
          predictedCpu: Math.max(0, Math.min(100, predictedValue)),
          confidence: this.calculateConfidence(i)
        });
      }

      return {
        success: true,
        predictions,
        trend: regression.m > 0 ? 'increasing' : 'decreasing',
        slope: regression.m
      };
    } catch (err) {
      console.error('[AI] Prediction failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Helper: Get metrics history
   */
  async getMetricsHistory(serviceId, days) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return await Metric.findAll({
      where: {
        serviceId,
        timestamp: { $gte: since }
      },
      order: [['timestamp', 'ASC']]
    });
  }

  /**
   * Helper: Get deployment history
   */
  async getDeploymentHistory(serviceId, days) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return await Deployment.findAll({
      where: {
        serviceId,
        createdAt: { $gte: since }
      },
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Helper: Analyze hourly patterns
   */
  analyzeHourlyPatterns(metrics) {
    const hourly = Array.from({ length: 24 }, () => ({ 
      values: [], 
      avgCpu: 0, 
      avgMemory: 0,
      avgRequests: 0 
    }));
    
    metrics.forEach(m => {
      const hour = new Date(m.timestamp).getHours();
      hourly[hour].values.push(m);
      hourly[hour].avgCpu += (m.cpuPercent || 0);
      hourly[hour].avgMemory += (m.memoryPercent || 0);
      hourly[hour].avgRequests += (m.requestCount || 0);
    });
    
    return hourly.map(h => ({
      avgCpu: h.values.length > 0 ? h.avgCpu / h.values.length : 0,
      avgMemory: h.values.length > 0 ? h.avgMemory / h.values.length : 0,
      avgRequests: h.values.length > 0 ? h.avgRequests / h.values.length : 0
    }));
  }

  /**
   * Helper: Group metrics by hour
   */
  groupByHour(metrics) {
    return this.analyzeHourlyPatterns(metrics);
  }

  /**
   * Helper: Compare weekend vs weekday
   */
  compareWeekendWeekday(metrics) {
    const weekend = metrics.filter(m => {
      const day = new Date(m.timestamp).getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    });
    
    const weekday = metrics.filter(m => {
      const day = new Date(m.timestamp).getDay();
      return day >= 1 && day <= 5;
    });
    
    const weekendAvg = weekend.length > 0 
      ? ss.mean(weekend.map(m => m.requestCount || 0))
      : 0;
      
    const weekdayAvg = weekday.length > 0
      ? ss.mean(weekday.map(m => m.requestCount || 0))
      : 1; // Avoid division by zero
    
    return {
      weekendAvg,
      weekdayAvg,
      ratio: weekdayAvg / weekendAvg
    };
  }

  /**
   * Helper: Get SSL expiry
   */
  async getSSLExpiry(service) {
    // Placeholder - in production, check actual SSL cert
    return 30; // 30 days default
  }

  /**
   * Helper: Calculate confidence for predictions
   */
  calculateConfidence(hours) {
    // Confidence decreases as we predict further
    return Math.max(0.5, 1 - (hours / 100));
  }

  /**
   * Helper: Generate summary
   */
  generateSummary(insights) {
    const critical = insights.filter(i => i.severity === 'critical').length;
    const warnings = insights.filter(i => i.severity === 'warning').length;
    const suggestions = insights.filter(i => i.severity === 'suggestion').length;
    
    return {
      total: insights.length,
      critical,
      warnings,
      suggestions,
      status: critical > 0 ? 'critical' : warnings > 0 ? 'warning' : 'healthy'
    };
  }

  /**
   * Get cached insights
   */
  getCachedInsights(serviceId) {
    const cached = this.insightsCache.get(serviceId);
    if (!cached) return null;
    
    // Check if cache is still valid (1 hour)
    const age = Date.now() - cached.generatedAt.getTime();
    if (age > 3600000) {
      this.insightsCache.delete(serviceId);
      return null;
    }
    
    return cached;
  }
}

module.exports = AIIntelligenceEngine;

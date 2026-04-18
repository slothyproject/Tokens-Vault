/**
 * routes/ai.js - AI Intelligence API Routes
 * RESTful API for AI-powered insights and predictions
 */

const express = require('express');
const router = express.Router();
const AIIntelligenceEngine = require('../services/ai-intelligence-engine');
const { authenticateToken } = require('./auth');
const { Service } = require('../database/models');

// Apply authentication
router.use(authenticateToken);

/**
 * GET /api/ai/insights/:serviceId
 * Get AI insights for a service
 */
router.get('/insights/:serviceId', async (req, res) => {
  try {
    const service = await Service.findOne({
      where: { 
        id: req.params.serviceId, 
        userId: req.user.userId 
      }
    });

    if (!service) {
      return res.status(404).json({ 
        success: false, 
        error: 'Service not found' 
      });
    }

    const ai = new AIIntelligenceEngine();
    const result = await ai.analyzeService(service.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('[AI] Insights error:', err);
    res.status(500).json({ success: false, error: 'Analysis failed' });
  }
});

/**
 * GET /api/ai/predict/:serviceId
 * Get predictions for a service
 */
router.get('/predict/:serviceId', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    
    const service = await Service.findOne({
      where: { 
        id: req.params.serviceId, 
        userId: req.user.userId 
      }
    });

    if (!service) {
      return res.status(404).json({ 
        success: false, 
        error: 'Service not found' 
      });
    }

    const ai = new AIIntelligenceEngine();
    const result = await ai.predictMetrics(service.id, parseInt(hours));
    
    res.json(result);
  } catch (err) {
    console.error('[AI] Prediction error:', err);
    res.status(500).json({ success: false, error: 'Prediction failed' });
  }
});

/**
 * GET /api/ai/dashboard
 * Get dashboard overview for all user's services
 */
router.get('/dashboard', async (req, res) => {
  try {
    const services = await Service.findAll({
      where: { userId: req.user.userId }
    });

    const ai = new AIIntelligenceEngine();
    const insights = [];

    // Analyze each service
    for (const service of services) {
      const result = await ai.analyzeService(service.id);
      if (result.success) {
        insights.push({
          serviceId: service.id,
          serviceName: service.name,
          ...result
        });
      }
    }

    // Calculate overall health
    const criticalCount = insights.reduce((sum, i) => 
      sum + i.summary.critical, 0);
    const warningCount = insights.reduce((sum, i) => 
      sum + i.summary.warnings, 0);

    res.json({
      success: true,
      overview: {
        totalServices: services.length,
        servicesAnalyzed: insights.length,
        criticalIssues: criticalCount,
        warnings: warningCount,
        overallStatus: criticalCount > 0 ? 'critical' : 
                      warningCount > 0 ? 'warning' : 'healthy'
      },
      insights
    });
  } catch (err) {
    console.error('[AI] Dashboard error:', err);
    res.status(500).json({ success: false, error: 'Dashboard generation failed' });
  }
});

/**
 * POST /api/ai/optimize/:serviceId
 * Get optimization suggestions
 */
router.post('/optimize/:serviceId', async (req, res) => {
  try {
    const service = await Service.findOne({
      where: { 
        id: req.params.serviceId, 
        userId: req.user.userId 
      }
    });

    if (!service) {
      return res.status(404).json({ 
        success: false, 
        error: 'Service not found' 
      });
    }

    const ai = new AIIntelligenceEngine();
    const result = await ai.analyzeService(service.id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    // Filter only optimization recommendations
    const optimizations = result.insights.filter(i => 
      i.type === 'recommendation' || i.type === 'cost'
    );

    // Calculate potential savings
    const totalSavings = optimizations
      .filter(o => o.potentialSavings)
      .reduce((sum, o) => {
        // Extract percentage from string like "~30-40%"
        const match = o.potentialSavings.match(/(\d+)%/);
        return sum + (match ? parseInt(match[1]) : 0);
      }, 0);

    res.json({
      success: true,
      service: service.name,
      optimizations,
      potentialSavings: `~${Math.round(totalSavings / optimizations.length)}%`,
      priority: optimizations.filter(o => o.severity === 'critical')
    });
  } catch (err) {
    console.error('[AI] Optimize error:', err);
    res.status(500).json({ success: false, error: 'Optimization failed' });
  }
});

module.exports = router;
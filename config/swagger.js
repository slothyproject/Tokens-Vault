/**
 * swagger.js - API Documentation
 * OpenAPI/Swagger documentation for Central Hub API
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Central Hub API',
      version: '2.0.0',
      description: 'Enterprise-grade Railway management platform with AI-powered automation',
      contact: {
        name: 'Central Hub Team',
        email: 'support@centralhub.io'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Local development server'
      },
      {
        url: 'https://central-hub.railway.app/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['user', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Service: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            railwayId: { type: 'string' },
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            cpuPercent: { type: 'number' },
            memoryPercent: { type: 'number' },
            lastDeployment: { type: 'string', format: 'date-time' },
            userId: { type: 'string', format: 'uuid' }
          }
        },
        Variable: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            serviceId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            value: { type: 'string' },
            encrypted: { type: 'boolean' }
          }
        },
        Deployment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            serviceId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'success', 'failed'] },
            url: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication and management' },
      { name: 'Services', description: 'Railway service operations' },
      { name: 'Variables', description: 'Environment variable management' },
      { name: 'Deployments', description: 'Deployment management' },
      { name: 'AI Intelligence', description: 'AI-powered insights and recommendations' },
      { name: 'WebSocket', description: 'Real-time updates' }
    ]
  },
  apis: ['./routes/*.js', './server.js'] // Files containing OpenAPI annotations
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };
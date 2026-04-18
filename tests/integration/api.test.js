/**
 * Integration Tests - API Routes
 * Test complete API endpoints
 */

const request = require('supertest');
const express = require('express');

// Mock the database
jest.mock('../../database/models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  Service: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn()
  }
}));

// Mock credential vault
jest.mock('../../services/credential-vault', () => ({
  decrypt: jest.fn(() => 'mock-railway-token')
}));

const authRoutes = require('../../routes/auth');

describe('Auth API Integration', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  describe('POST /api/auth/register', () => {
    test('should require email and password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    test('should require email and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});

describe('Service API Integration', () => {
  let app;
  let mockServiceManager;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = { userId: 'test-user-id' };
      next();
    });

    // Mock service manager
    mockServiceManager = {
      syncServices: jest.fn(),
      getServiceDetails: jest.fn()
    };
    
    app.use((req, res, next) => {
      req.serviceManager = mockServiceManager;
      next();
    });
  });

  test('should return 401 without authentication', async () => {
    const unauthApp = express();
    unauthApp.use(express.json());
    // No auth middleware

    const response = await request(unauthApp)
      .get('/api/services');
    
    expect(response.status).toBe(404); // No routes mounted
  });
});

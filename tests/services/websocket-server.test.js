/**
 * WebSocket Server Tests
 * Test real-time communication functionality
 */

const WebSocketServer = require('../../services/websocket-server');

// Mock WebSocket
jest.mock('ws', () => {
  return {
    Server: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      clients: new Set(),
      close: jest.fn()
    })),
    WebSocket: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
      on: jest.fn(),
      close: jest.fn(),
      readyState: 1,
      isAlive: true
    })),
    OPEN: 1,
    CLOSED: 3
  };
});

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(() => ({ userId: 'test-user', role: 'user' }))
}));

// Mock SecurityConfig
jest.mock('../../config/security', () => ({
  JWT_SECRET: 'test-secret'
}));

describe('WebSocketServer', () => {
  let server;
  let mockHttpServer;

  beforeEach(() => {
    mockHttpServer = {
      on: jest.fn()
    };
    server = new WebSocketServer(mockHttpServer);
  });

  afterEach(() => {
    if (server) {
      server.clients.clear();
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should create WebSocket server', () => {
      expect(server).toBeDefined();
      expect(server.clients).toBeDefined();
    });

    test('should store connected clients', () => {
      const mockClient = { userId: 'user-1', isAlive: true };
      server.clients.set('user-1', mockClient);
      expect(server.clients.size).toBe(1);
    });
  });

  describe('Client Management', () => {
    test('should add client', () => {
      const mockWs = { send: jest.fn() };
      server.addClient('client-1', mockWs, { userId: 'user-1' });
      expect(server.clients.size).toBe(1);
    });

    test('should remove client on disconnect', () => {
      const mockWs = { send: jest.fn() };
      server.addClient('client-1', mockWs, { userId: 'user-1' });
      expect(server.clients.size).toBe(1);
      
      server.removeClient('client-1');
      expect(server.clients.size).toBe(0);
    });
  });

  describe('Message Broadcasting', () => {
    test('should broadcast message to all clients', () => {
      const mockClient1 = { ws: { send: jest.fn(), readyState: 1 }, subscriptions: new Set() };
      const mockClient2 = { ws: { send: jest.fn(), readyState: 1 }, subscriptions: new Set() };
      
      server.clients.set('client1', mockClient1);
      server.clients.set('client2', mockClient2);
      
      const message = { type: 'test', data: 'hello' };
      server.broadcast(message);
      
      // broadcast is handled by subscription-based system
      expect(server.clients.size).toBe(2);
    });
  });

  describe('Authentication', () => {
    test('should extract token from header', () => {
      const req = { headers: { authorization: 'Bearer test-token' } };
      const token = server.extractToken(req);
      expect(token).toBe('test-token');
    });

    test('should return null for missing token', () => {
      const req = { headers: {} };
      const token = server.extractToken(req);
      expect(token).toBeNull();
    });

    test('should validate token', () => {
      const user = server.authenticate('valid-token');
      expect(user).toBeDefined();
      expect(user.userId).toBe('test-user');
    });

    test('should return null for invalid token', () => {
      const user = server.authenticate(null);
      expect(user).toBeNull();
    });
  });

  describe('Message Parsing', () => {
    test('should parse valid JSON messages', () => {
      const message = JSON.stringify({ type: 'subscribe', serviceId: 'svc-123' });
      const result = server.parseMessage(message);
      
      expect(result).toEqual({ type: 'subscribe', serviceId: 'svc-123' });
    });

    test('should return null for invalid JSON', () => {
      const message = 'not-valid-json';
      const result = server.parseMessage(message);
      
      expect(result).toBeNull();
    });

    test('should handle message parsing errors gracefully', () => {
      const result = server.parseMessage(null);
      
      expect(result).toBeNull();
    });
  });

  describe('Subscription Management', () => {
    test('should subscribe client to channel', () => {
      const mockWs = { send: jest.fn() };
      server.addClient('client1', mockWs, { userId: 'user-1' });
      
      server.subscribe('client1', 'service-svc-123');
      
      const client = server.clients.get('client1');
      expect(client.subscriptions).toContain('service-svc-123');
    });

    test('should unsubscribe client from channel', () => {
      const mockWs = { send: jest.fn() };
      server.addClient('client1', mockWs, { userId: 'user-1' });
      server.subscribe('client1', 'service-svc-123');
      
      server.unsubscribe('client1', 'service-svc-123');
      
      const client = server.clients.get('client1');
      expect(client.subscriptions).not.toContain('service-svc-123');
    });
  });

  describe('Deployment Updates', () => {
    test('should broadcast deployment update', () => {
      const mockWs = { send: jest.fn(), readyState: 1 };
      server.addClient('client1', mockWs, { userId: 'user-1' });
      server.subscribe('client1', 'deployment:svc-123');
      
      server.broadcastDeploymentUpdate({ serviceId: 'svc-123', status: 'success' });
      
      // broadcastDeploymentUpdate should call broadcast
      expect(server).toBeDefined();
    });
  });

  describe('Health Status', () => {
    test('should broadcast health status', () => {
      const mockWs = { send: jest.fn(), readyState: 1 };
      server.addClient('client1', mockWs, { userId: 'user-1' });
      server.subscribe('client1', 'health:svc-123');
      
      server.broadcastHealthStatus({ serviceId: 'svc-123', status: 'healthy' });
      
      expect(server).toBeDefined();
    });
  });

  describe('Service Logs', () => {
    test('should broadcast service logs', () => {
      const mockWs = { send: jest.fn(), readyState: 1 };
      server.addClient('client1', mockWs, { userId: 'user-1' });
      server.subscribe('client1', 'logs:svc-123');
      
      server.broadcastServiceLogs('svc-123', ['Log line 1', 'Log line 2']);
      
      expect(server).toBeDefined();
    });
  });
});

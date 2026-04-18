/**
 * websocket-server.js - Real-Time WebSocket Server
 * Live updates for service status, logs, and deployments
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const SecurityConfig = require('../config/security');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      // Heartbeat to keep connections alive
      clientTracking: true
    });
    
    this.clients = new Map(); // userId -> { ws, subscriptions }
    
    this.setupHandlers();
    this.startHeartbeat();
    
    console.log('[WebSocket] Server initialized on /ws');
  }

  /**
   * Setup WebSocket event handlers
   */
  setupHandlers() {
    this.wss.on('connection', (ws, req) => {
      console.log('[WebSocket] New connection attempt');
      
      // Authenticate connection
      const token = this.extractToken(req);
      const user = this.authenticate(token);
      
      if (!user) {
        console.log('[WebSocket] Authentication failed, closing connection');
        ws.close(1008, 'Invalid token');
        return;
      }

      // Store client
      this.clients.set(ws, {
        userId: user.userId,
        subscriptions: new Set(),
        isAlive: true
      });

      console.log(`[WebSocket] Client connected: ${user.userId}`);

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connected',
        message: 'WebSocket connection established',
        timestamp: new Date().toISOString()
      });

      // Handle messages
      ws.on('message', (data) => this.handleMessage(ws, data));
      
      // Handle close
      ws.on('close', () => this.handleClose(ws));
      
      // Handle pong (heartbeat response)
      ws.on('pong', () => {
        const client = this.clients.get(ws);
        if (client) {
          client.isAlive = true;
        }
      });
    });
  }

  /**
   * Extract JWT token from request
   */
  extractToken(req) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Also check query params
    const url = new URL(req.url, 'http://localhost');
    return url.searchParams.get('token');
  }

  /**
   * Authenticate JWT token
   */
  authenticate(token) {
    try {
      return jwt.verify(token, SecurityConfig.auth.jwtSecret);
    } catch (err) {
      return null;
    }
  }

  /**
   * Handle incoming messages
   */
  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data);
      const client = this.clients.get(ws);
      
      if (!client) return;

      console.log(`[WebSocket] Received ${message.type} from ${client.userId}`);

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(ws, client, message);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscribe(ws, client, message);
          break;
          
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
          break;
          
        default:
          console.log(`[WebSocket] Unknown message type: ${message.type}`);
      }
    } catch (err) {
      console.error('[WebSocket] Message error:', err);
    }
  }

  /**
   * Handle subscription request
   */
  handleSubscribe(ws, client, message) {
    const { serviceId, channel } = message;
    
    if (!serviceId || !channel) {
      this.sendToClient(ws, {
        type: 'error',
        message: 'serviceId and channel are required'
      });
      return;
    }

    const subscriptionKey = `${serviceId}:${channel}`;
    client.subscriptions.add(subscriptionKey);
    
    console.log(`[WebSocket] ${client.userId} subscribed to ${subscriptionKey}`);
    
    this.sendToClient(ws, {
      type: 'subscribed',
      serviceId,
      channel,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle unsubscribe request
   */
  handleUnsubscribe(ws, client, message) {
    const { serviceId, channel } = message;
    
    if (!serviceId || !channel) return;
    
    const subscriptionKey = `${serviceId}:${channel}`;
    client.subscriptions.delete(subscriptionKey);
    
    console.log(`[WebSocket] ${client.userId} unsubscribed from ${subscriptionKey}`);
    
    this.sendToClient(ws, {
      type: 'unsubscribed',
      serviceId,
      channel
    });
  }

  /**
   * Handle client disconnect
   */
  handleClose(ws) {
    const client = this.clients.get(ws);
    if (client) {
      console.log(`[WebSocket] Client disconnected: ${client.userId}`);
      this.clients.delete(ws);
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast to all clients subscribed to a service/channel
   */
  broadcast(serviceId, channel, data) {
    const subscriptionKey = `${serviceId}:${channel}`;
    
    for (const [ws, client] of this.clients.entries()) {
      if (client.subscriptions.has(subscriptionKey)) {
        this.sendToClient(ws, {
          type: 'update',
          channel,
          serviceId,
          data,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Broadcast deployment status
   */
  broadcastDeployment(serviceId, status) {
    this.broadcast(serviceId, 'deployments', {
      event: 'deployment_update',
      status,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast log line
   */
  broadcastLog(serviceId, logLine) {
    this.broadcast(serviceId, 'logs', {
      event: 'log_line',
      message: logLine,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast service health update
   */
  broadcastHealth(serviceId, health) {
    this.broadcast(serviceId, 'health', {
      event: 'health_update',
      health,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast variable update
   */
  broadcastVariables(serviceId, variables) {
    this.broadcast(serviceId, 'variables', {
      event: 'variables_update',
      variables,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Start heartbeat to detect dead connections
   */
  startHeartbeat() {
    setInterval(() => {
      for (const [ws, client] of this.clients.entries()) {
        if (!client.isAlive) {
          console.log('[WebSocket] Terminating inactive connection');
          ws.terminate();
          this.clients.delete(ws);
          continue;
        }
        
        client.isAlive = false;
        ws.ping();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get connected clients count
   */
  getConnectedCount() {
    return this.clients.size;
  }
}

module.exports = WebSocketServer;

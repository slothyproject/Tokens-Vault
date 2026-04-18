/**
 * security.js - Centralized Security Configuration
 * Enterprise-grade security settings
 */

const SecurityConfig = {
  // Authentication
  auth: {
    // JWT Configuration
    jwtSecret: process.env.JWT_SECRET || require('crypto').randomBytes(64).toString('hex'),
    jwtExpiresIn: '1h',
    jwtRefreshExpiresIn: '7d',
    
    // Password Policy
    password: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: 90, // days
      historyCount: 5 // prevent reuse of last 5 passwords
    },
    
    // Session Management
    session: {
      maxAge: 15 * 60 * 1000, // 15 minutes
      rolling: true,
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict'
    },
    
    // Rate Limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per window
      skipSuccessfulRequests: false
    },
    
    // Lockout Policy
    lockout: {
      maxAttempts: 5,
      lockoutTime: 15 * 60 * 1000, // 15 minutes
      resetAfter: 24 * 60 * 60 * 1000 // 24 hours
    }
  },
  
  // Encryption
  encryption: {
    // AES-256-GCM for data at rest
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
    
    // Master key (store in env, not code!)
    masterKey: process.env.ENCRYPTION_MASTER_KEY
  },
  
  // CORS Configuration
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:8080',
      'https://central-hub.railway.app'
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
    maxAge: 86400 // 24 hours
  },
  
  // Content Security Policy
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "blob:", "https:"],
    connectSrc: ["'self'", "https://backboard.railway.app", "wss:"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"]
  },
  
  // Logging
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    sanitize: true, // Remove sensitive data from logs
    audit: {
      enabled: true,
      events: ['login', 'logout', 'password_change', 'deploy', 'variable_update']
    }
  },
  
  // Input Validation
  validation: {
    maxRequestSize: '50mb',
    maxJsonDepth: 10,
    allowedContentTypes: ['application/json', 'multipart/form-data']
  }
};

module.exports = SecurityConfig;

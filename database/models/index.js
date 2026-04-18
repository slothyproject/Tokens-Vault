/**
 * models/index.js - Database Models
 * Central Hub data models with Sequelize ORM
 */

const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../database');

// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  role: {
    type: DataTypes.ENUM('admin', 'user', 'viewer'),
    defaultValue: 'user'
  },
  lastLogin: {
    type: DataTypes.DATE,
    field: 'last_login'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

// Service Model (Railway services)
const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    field: 'user_id'
  },
  railwayServiceId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'railway_service_id'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('healthy', 'degraded', 'unhealthy', 'offline'),
    defaultValue: 'offline'
  },
  serviceType: {
    type: DataTypes.STRING(50),
    field: 'service_type'
  },
  url: {
    type: DataTypes.STRING(500)
  },
  config: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  healthScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'health_score'
  },
  lastDeployedAt: {
    type: DataTypes.DATE,
    field: 'last_deployed_at'
  }
}, {
  tableName: 'services',
  timestamps: true,
  underscored: true
});

// Variable Model (Environment variables)
const Variable = sequelize.define('Variable', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  serviceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Service,
      key: 'id'
    },
    field: 'service_id'
  },
  key: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isEncrypted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_encrypted'
  },
  isShared: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_shared'
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    field: 'last_sync_at'
  }
}, {
  tableName: 'variables',
  timestamps: true,
  underscored: true
});

// Deployment Model
const Deployment = sequelize.define('Deployment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  serviceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Service,
      key: 'id'
    },
    field: 'service_id'
  },
  deploymentId: {
    type: DataTypes.STRING(255),
    field: 'deployment_id'
  },
  status: {
    type: DataTypes.ENUM('pending', 'building', 'deploying', 'success', 'failed', 'cancelled'),
    defaultValue: 'pending'
  },
  commitHash: {
    type: DataTypes.STRING(40),
    field: 'commit_hash'
  },
  commitMessage: {
    type: DataTypes.TEXT,
    field: 'commit_message'
  },
  branch: {
    type: DataTypes.STRING(255)
  },
  startedAt: {
    type: DataTypes.DATE,
    field: 'started_at'
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at'
  },
  duration: {
    type: DataTypes.INTEGER // in seconds
  },
  logs: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'deployments',
  timestamps: true,
  underscored: true
});

// Credential Model (encrypted tokens)
const Credential = sequelize.define('Credential', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    field: 'user_id'
  },
  serviceType: {
    type: DataTypes.ENUM('railway', 'github', 'discord', 'custom'),
    allowNull: false,
    field: 'service_type'
  },
  encryptedToken: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'encrypted_token'
  },
  iv: {
    type: DataTypes.STRING(64)
  },
  tag: {
    type: DataTypes.STRING(128)
  },
  expiresAt: {
    type: DataTypes.DATE,
    field: 'expires_at'
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    field: 'last_used_at'
  }
}, {
  tableName: 'credentials',
  timestamps: true,
  underscored: true
});

// Audit Log Model
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    references: {
      model: User,
      key: 'id'
    },
    field: 'user_id'
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  resourceType: {
    type: DataTypes.STRING(50),
    field: 'resource_type'
  },
  resourceId: {
    type: DataTypes.STRING(255),
    field: 'resource_id'
  },
  changes: {
    type: DataTypes.JSONB
  },
  ipAddress: {
    type: DataTypes.INET,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent'
  },
  severity: {
    type: DataTypes.ENUM('info', 'warning', 'error', 'critical'),
    defaultValue: 'info'
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true
});

// Metrics Model (for AI learning)
const Metric = sequelize.define('Metric', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  serviceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Service,
      key: 'id'
    },
    field: 'service_id'
  },
  cpuPercent: {
    type: DataTypes.DECIMAL(5, 2),
    field: 'cpu_percent'
  },
  memoryMb: {
    type: DataTypes.INTEGER,
    field: 'memory_mb'
  },
  memoryPercent: {
    type: DataTypes.DECIMAL(5, 2),
    field: 'memory_percent'
  },
  responseTimeMs: {
    type: DataTypes.INTEGER,
    field: 'response_time_ms'
  },
  requestCount: {
    type: DataTypes.INTEGER,
    field: 'request_count'
  },
  errorRate: {
    type: DataTypes.DECIMAL(5, 2),
    field: 'error_rate'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'metrics',
  timestamps: false,
  underscored: true
});

// Define associations
User.hasMany(Service, { foreignKey: 'user_id' });
Service.belongsTo(User, { foreignKey: 'user_id' });

Service.hasMany(Variable, { foreignKey: 'service_id' });
Variable.belongsTo(Service, { foreignKey: 'service_id' });

Service.hasMany(Deployment, { foreignKey: 'service_id' });
Deployment.belongsTo(Service, { foreignKey: 'service_id' });

User.hasMany(Credential, { foreignKey: 'user_id' });
Credential.belongsTo(User, { foreignKey: 'user_id' });

Service.hasMany(Metric, { foreignKey: 'service_id' });
Metric.belongsTo(Service, { foreignKey: 'service_id' });

module.exports = {
  User,
  Service,
  Variable,
  Deployment,
  Credential,
  AuditLog,
  Metric,
  sequelize
};

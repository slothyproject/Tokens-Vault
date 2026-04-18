/**
 * database.js - PostgreSQL Database Connection
 * Central Hub Enterprise Database Layer
 */

const { Pool } = require('pg');
const { Sequelize } = require('sequelize');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'central_hub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Sequelize ORM instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.user,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('[Database] ✅ PostgreSQL connection established successfully');
    return true;
  } catch (error) {
    console.error('[Database] ❌ Unable to connect to database:', error.message);
    return false;
  }
}

// Initialize database (create tables if not exist)
async function initDatabase() {
  try {
    // Test raw connection first
    const client = await pool.connect();
    console.log('[Database] ✅ Pool connection successful');
    client.release();
    
    // Sync Sequelize models
    await sequelize.sync({ alter: true });
    console.log('[Database] ✅ Database models synchronized');
    
    return true;
  } catch (error) {
    console.error('[Database] ❌ Database initialization failed:', error.message);
    return false;
  }
}

// Health check
async function healthCheck() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return { status: 'healthy', timestamp: new Date() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

module.exports = {
  pool,
  sequelize,
  testConnection,
  initDatabase,
  healthCheck
};

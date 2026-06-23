const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'accounts_db',
  user: process.env.DB_USER || 'neowallet',
  password: process.env.DB_PASSWORD || 'neowallet_secret',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error(JSON.stringify({
    level: 'ERROR',
    timestamp: new Date().toISOString(),
    service: 'accounts-service',
    message: 'Unexpected PostgreSQL pool error',
    error: err.message,
  }));
});

module.exports = pool;

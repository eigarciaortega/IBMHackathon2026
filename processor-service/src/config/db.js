/**
 * Pool de conexiones a PostgreSQL (processor_db — privada del servicio).
 */
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5433,
  user: process.env.PGUSER || 'neowallet',
  password: process.env.PGPASSWORD || 'neowallet',
  database: process.env.PGDATABASE || 'processor_db',
  max: Number(process.env.PGPOOL_MAX) || 20,
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 3000,
  query_timeout: Number(process.env.PG_QUERY_TIMEOUT_MS) || 10000,
  statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS) || 10000,
})

pool.on('error', (err) => console.error('[db] Error inesperado en el pool', err))

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
}

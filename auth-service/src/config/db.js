/**
 * Pool de conexiones a PostgreSQL (base de datos compartida).
 * Lee la configuración desde variables de entorno estándar de `pg`.
 */
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'officespace',
  password: process.env.PGPASSWORD || 'officespace',
  database: process.env.PGDATABASE || 'officespace',
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

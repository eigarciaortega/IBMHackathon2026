/**
 * Pool de conexiones a PostgreSQL (accounts_db — privada del servicio).
 * Lee la configuración de variables de entorno estándar de `pg`.
 */
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'neowallet',
  password: process.env.PGPASSWORD || 'neowallet',
  database: process.env.PGDATABASE || 'accounts_db',
  max: Number(process.env.PGPOOL_MAX) || 20,
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 3000,
  query_timeout: Number(process.env.PG_QUERY_TIMEOUT_MS) || 10000,
  statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS) || 10000,
})

pool.on('error', (err) => console.error('[db] Error inesperado en el pool', err))

/**
 * Ejecuta `fn(client)` dentro de una transacción BEGIN/COMMIT.
 * Si `fn` lanza, hace ROLLBACK automático. Es la pieza que garantiza la
 * ATOMICIDAD ("todo o nada") de recargas y movimientos de saldo, y que
 * junto a `SELECT ... FOR UPDATE` evita condiciones de carrera (RNF-006).
 */
async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch (_) {
      /* el rollback puede fallar si la conexión murió; lo ignoramos */
    }
    throw err
  } finally {
    client.release()
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  withTransaction,
}

/**
 * Acceso a datos de `transactions` (processor_db). Aísla el SQL del resto
 * del servicio: el orquestador Saga y la reconciliación dependen de esta
 * interfaz, no de PostgreSQL directamente.
 */
const { query } = require('../config/db')
const { roundMoney, formatMoney } = require('../utils/money')

/** Da forma pública a una fila de transacción. */
function present(row) {
  if (!row) return null
  return {
    id: row.id,
    transaction_id: row.id,
    sender_id: row.sender_id,
    receiver_id: row.receiver_id,
    amount: roundMoney(row.amount),
    amount_formatted: formatMoney(row.amount),
    status: row.status,
    idempotency_key: row.idempotency_key,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/** Crea la transacción en estado PENDING y devuelve la fila. */
async function create({ senderId, receiverId, amount, idempotencyKey }) {
  const { rows } = await query(
    `INSERT INTO transactions (sender_id, receiver_id, amount, status, idempotency_key)
     VALUES ($1, $2, $3, 'PENDING', $4) RETURNING *`,
    [senderId, receiverId, amount, idempotencyKey || null],
  )
  return rows[0]
}

/** Cambia el estado (y opcionalmente el mensaje de error) de una transacción. */
async function setStatus(id, status, errorMessage = null) {
  const { rows } = await query(
    'UPDATE transactions SET status = $1, error_message = $2 WHERE id = $3 RETURNING *',
    [status, errorMessage, id],
  )
  return rows[0]
}

/** Busca una transacción por su clave de idempotencia. */
async function findByIdempotencyKey(key) {
  if (!key) return null
  const { rows } = await query('SELECT * FROM transactions WHERE idempotency_key = $1', [key])
  return rows[0] || null
}

/** Devuelve una transacción por id. */
async function findById(id) {
  const { rows } = await query('SELECT * FROM transactions WHERE id = $1', [id])
  return rows[0] || null
}

/** Historial de un usuario (como sender o receiver), con paginación. */
async function listByUser(userId, { limit = 50, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT * FROM transactions
     WHERE sender_id = $1 OR receiver_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  )
  return rows
}

/** Transacciones "atascadas" (no terminales) más viejas que N segundos. */
async function findStuck(seconds) {
  const { rows } = await query(
    `SELECT * FROM transactions
     WHERE status IN ('PENDING', 'DEBITED')
       AND updated_at < now() - ($1 || ' seconds')::interval
     ORDER BY updated_at ASC`,
    [String(seconds)],
  )
  return rows
}

module.exports = {
  present,
  create,
  setStatus,
  findByIdempotencyKey,
  findById,
  listByUser,
  findStuck,
}

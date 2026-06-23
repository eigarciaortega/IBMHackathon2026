/**
 * Controlador del accounts-service: gestiona usuarios, saldos y el libro
 * mayor de auditoría. Es el ÚNICO componente autorizado a tocar dinero.
 *
 * Toda mutación de saldo ocurre dentro de una transacción de BD con
 * `SELECT ... FOR UPDATE` (bloqueo de fila) para ser atómica y a prueba
 * de condiciones de carrera (RNF-006 · Consistencia de datos).
 */
const { validationResult } = require('express-validator')
const { query, withTransaction } = require('../config/db')
const { roundMoney, formatMoney } = require('../utils/money')
const notificationClient = require('../services/notificationClient')
const logger = require('../config/logger')

/** Da forma a la respuesta pública de un usuario (saldo con 2 decimales). */
function presentUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    balance: roundMoney(row.balance),
    balance_formatted: formatMoney(row.balance),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/** Recoge los errores de express-validator en formato uniforme. */
function collectErrors(req, res) {
  const result = validationResult(req)
  if (result.isEmpty()) return false
  res.status(400).json({ error: 'invalid_request', detalles: result.array() })
  return true
}

// ---------------------------------------------------------------------
// RF-001 · GET /accounts/:id  — Consultar saldo
// ---------------------------------------------------------------------
async function getAccount(req, res, next) {
  if (collectErrors(req, res)) return
  try {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'user_not_found' })
    return res.json(presentUser(rows[0]))
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------
// GET /accounts  — Listar cuentas (utilidad para demo/observabilidad)
// ---------------------------------------------------------------------
async function listAccounts(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM users ORDER BY id')
    return res.json(rows.map(presentUser))
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------
// GET /accounts/directory  — Directorio de beneficiarios (sin saldos)
// ---------------------------------------------------------------------
// Para elegir a quién enviar dinero. Solo datos públicos (id, nombre, correo).
async function getDirectory(req, res, next) {
  try {
    const { rows } = await query('SELECT id, name, email FROM users ORDER BY name')
    return res.json(rows.map((u) => ({ id: u.id, name: u.name, email: u.email })))
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------
// RF-002 · POST /api/recharge  — Recargar saldo (simulado)
// ---------------------------------------------------------------------
async function recharge(req, res, next) {
  if (collectErrors(req, res)) return
  // El usuario proviene del token (no del body) — un usuario solo recarga lo suyo.
  const userId = req.user.id
  const amount = roundMoney(req.body.amount)
  const paymentMethod = req.body.payment_method || 'CREDIT_CARD'

  try {
    const result = await withTransaction(async (client) => {
      // Bloqueamos la fila del usuario para una recarga atómica.
      const { rows } = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId])
      const user = rows[0]
      if (!user) return { notFound: true }

      const before = roundMoney(user.balance)
      const after = roundMoney(before + amount)

      const upd = await client.query(
        'UPDATE users SET balance = $1 WHERE id = $2 RETURNING *',
        [after, userId],
      )
      // Asiento en el libro mayor (auditoría de toda operación monetaria).
      await client.query(
        `INSERT INTO balance_ledger (user_id, operation, amount, balance_before, balance_after, reference)
         VALUES ($1, 'recharge', $2, $3, $4, $5)`,
        [userId, amount, before, after, `recharge:${paymentMethod}`],
      )
      return { user: upd.rows[0], before, after }
    })

    if (result.notFound) return res.status(404).json({ error: 'user_not_found' })

    logger.info('recarga aplicada', {
      reqId: req.id, user_id: userId, amount, balance_after: result.after, payment_method: paymentMethod,
    })

    // Confirmación por SMS + correo (no bloquea ni revierte si falla).
    notificationClient.notify({
      channel: 'both',
      to: { name: result.user.name, email: result.user.email, phone: result.user.phone },
      template: 'recharge',
      data: {
        amount: formatMoney(amount),
        payment_method: paymentMethod,
        new_balance: formatMoney(result.after),
      },
    })

    return res.status(200).json({
      message: 'Recarga exitosa',
      user_id: userId,
      payment_method: paymentMethod,
      amount: roundMoney(amount),
      previous_balance: roundMoney(result.before),
      new_balance: roundMoney(result.after),
      new_balance_formatted: formatMoney(result.after),
    })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------
// RF-004 · POST /accounts/update-balance  — Movimiento interno (debit/credit)
// ---------------------------------------------------------------------
// Endpoint consumido por el processor-service durante la Saga. Atómico y
// con verificación de fondos en los débitos.
async function updateBalance(req, res, next) {
  if (collectErrors(req, res)) return
  const userId = Number(req.body.user_id)
  const amount = roundMoney(req.body.amount)
  const operation = req.body.operation
  const reference = req.body.reference || null

  try {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId])
      const user = rows[0]
      if (!user) return { notFound: true }

      const before = roundMoney(user.balance)
      if (operation === 'debit' && before < amount) {
        return { insufficient: true, before }
      }

      const after = operation === 'debit'
        ? roundMoney(before - amount)
        : roundMoney(before + amount)

      const upd = await client.query(
        'UPDATE users SET balance = $1 WHERE id = $2 RETURNING *',
        [after, userId],
      )
      await client.query(
        `INSERT INTO balance_ledger (user_id, operation, amount, balance_before, balance_after, reference)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, operation, amount, before, after, reference],
      )
      return { user: upd.rows[0], before, after }
    })

    if (result.notFound) return res.status(404).json({ error: 'user_not_found' })
    if (result.insufficient) {
      logger.warn('debito rechazado por fondos insuficientes', {
        reqId: req.id, user_id: userId, amount, balance: result.before,
      })
      return res.status(400).json({ error: 'insufficient_funds', balance: roundMoney(result.before) })
    }

    logger.info('balance actualizado', {
      reqId: req.id, user_id: userId, operation, amount, balance_after: result.after, reference,
    })

    return res.status(200).json({
      user_id: userId,
      operation,
      amount: roundMoney(amount),
      previous_balance: roundMoney(result.before),
      new_balance: roundMoney(result.after),
      new_balance_formatted: formatMoney(result.after),
    })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------
// GET /accounts/:id/ledger  — Asientos de auditoría de un usuario
// ---------------------------------------------------------------------
async function getLedger(req, res, next) {
  if (collectErrors(req, res)) return
  try {
    const exists = await query('SELECT id FROM users WHERE id = $1', [req.params.id])
    if (!exists.rows[0]) return res.status(404).json({ error: 'user_not_found' })

    const { rows } = await query(
      'SELECT * FROM balance_ledger WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
      [req.params.id],
    )
    return res.json({
      user_id: Number(req.params.id),
      count: rows.length,
      entries: rows.map((e) => ({
        id: e.id,
        operation: e.operation,
        amount: roundMoney(e.amount),
        balance_before: roundMoney(e.balance_before),
        balance_after: roundMoney(e.balance_after),
        reference: e.reference,
        created_at: e.created_at,
      })),
    })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------
// GET /accounts/ledger/by-reference?reference=...  — Asientos por referencia
// ---------------------------------------------------------------------
// Lo consume el job de reconciliación del processor para saber, ante una
// transacción atascada, qué movimientos se aplicaron realmente.
async function getLedgerByReference(req, res, next) {
  const reference = (req.query.reference || '').toString()
  if (!reference) return res.status(400).json({ error: 'missing_reference' })
  try {
    const { rows } = await query(
      'SELECT * FROM balance_ledger WHERE reference = $1 ORDER BY created_at ASC, id ASC',
      [reference],
    )
    return res.json({
      reference,
      count: rows.length,
      entries: rows.map((e) => ({
        id: e.id,
        user_id: e.user_id,
        operation: e.operation,
        amount: roundMoney(e.amount),
        balance_before: roundMoney(e.balance_before),
        balance_after: roundMoney(e.balance_after),
        created_at: e.created_at,
      })),
    })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------
// GET /accounts/admin/total-balance  — Conservación del dinero (RNF-006)
// ---------------------------------------------------------------------
// Suma TODOS los saldos. La demo verifica que este total permanezca
// constante a través de las transferencias (no se crea ni destruye dinero).
async function totalBalance(req, res, next) {
  try {
    const { rows } = await query(
      'SELECT COALESCE(SUM(balance), 0) AS total, COUNT(*) AS users FROM users',
    )
    return res.json({
      total_balance: roundMoney(rows[0].total),
      total_balance_formatted: formatMoney(rows[0].total),
      users: Number(rows[0].users),
      checked_at: new Date().toISOString(),
    })
  } catch (err) {
    return next(err)
  }
}

module.exports = {
  getAccount,
  listAccounts,
  getDirectory,
  recharge,
  updateBalance,
  getLedger,
  getLedgerByReference,
  totalBalance,
  presentUser,
}

/**
 * Controlador del processor-service: transferencias P2P (Saga), historial,
 * envío del historial por correo y disparo manual de la reconciliación.
 */
const { validationResult } = require('express-validator')
const repo = require('../repositories/transactionRepo')
const accounts = require('../services/accountsClient')
const notifier = require('../services/notificationClient')
const transferSaga = require('../saga/transferSaga')
const reconciliation = require('../services/reconciliation')
const { roundMoney, formatMoney } = require('../utils/money')
const logger = require('../config/logger')

function collectErrors(req, res) {
  const result = validationResult(req)
  if (result.isEmpty()) return false
  res.status(400).json({ error: 'invalid_request', detalles: result.array() })
  return true
}

// ---------------------------------------------------------------------
// RF-003 · POST /api/transfer  — Transferencia P2P con patrón Saga
// ---------------------------------------------------------------------
async function transfer(req, res, next) {
  if (collectErrors(req, res)) return

  // El remitente SIEMPRE es el usuario autenticado (no se confía en el body).
  const senderId = req.user.id
  const receiverId = Number(req.body.receiver_id)
  const amount = roundMoney(req.body.amount)
  const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotency_key || null

  // RN-002 / FA-1: no se permite transferirse a uno mismo.
  if (senderId === receiverId) {
    return res.status(400).json({
      error: 'self_transfer_not_allowed',
      message: 'No puedes transferirte dinero a ti mismo',
    })
  }

  try {
    // --- Idempotencia (bonus): no ejecutar dos veces la misma operación.
    if (idempotencyKey) {
      const existing = await repo.findByIdempotencyKey(idempotencyKey)
      if (existing) {
        logger.info('idempotencia: respuesta repetida', { transaction_id: existing.id, idempotencyKey })
        return res.status(200).json({
          idempotent_replay: true,
          message: 'Operación ya procesada previamente con esta Idempotency-Key',
          ...repo.present(existing),
        })
      }
    }

    // Se crea la transacción en PENDING ANTES de mover dinero (trazabilidad).
    let tx
    try {
      tx = await repo.create({ senderId, receiverId, amount, idempotencyKey })
    } catch (err) {
      // Carrera con misma Idempotency-Key (violación de UNIQUE).
      if (err.code === '23505' && idempotencyKey) {
        const existing = await repo.findByIdempotencyKey(idempotencyKey)
        if (existing) return res.status(200).json({ idempotent_replay: true, ...repo.present(existing) })
      }
      throw err
    }

    logger.info('transferencia iniciada', { transaction_id: tx.id, senderId, receiverId, amount, reqId: req.id })

    // --- Ejecutar la Saga -------------------------------------------
    const result = await transferSaga.execute(tx)
    const txId = result.transaction.id

    switch (result.outcome) {
      case 'completed': {
        // Confirmaciones por SMS + correo (fire-and-forget) a ambos.
        notifier.notify({
          channel: 'both',
          to: { name: result.sender.name, email: result.sender.email, phone: result.sender.phone },
          template: 'transfer_sent',
          data: {
            amount: formatMoney(amount),
            counterparty: result.receiver.name,
            transaction_id: txId,
            new_balance: formatMoney(result.sender_balance),
          },
        })
        notifier.notify({
          channel: 'both',
          to: { name: result.receiver.name, email: result.receiver.email, phone: result.receiver.phone },
          template: 'transfer_received',
          data: {
            amount: formatMoney(amount),
            counterparty: result.sender.name,
            transaction_id: txId,
            new_balance: formatMoney(result.receiver_balance),
          },
        })
        return res.status(201).json({
          message: 'Transferencia completada',
          transaction_id: txId,
          status: 'COMPLETED',
          sender_id: senderId,
          receiver_id: receiverId,
          amount: roundMoney(amount),
          sender_balance: roundMoney(result.sender_balance),
          receiver_balance: roundMoney(result.receiver_balance),
          notifications: 'enviadas (SMS + correo)',
        })
      }
      case 'insufficient_funds':
        return res.status(400).json({
          error: 'insufficient_funds',
          message: 'El sender no tiene saldo suficiente',
          transaction_id: txId,
          balance: roundMoney(result.balance),
        })
      case 'user_not_found':
        return res.status(404).json({
          error: 'user_not_found',
          message: `El ${result.who} no existe`,
          who: result.who,
          transaction_id: txId,
        })
      case 'rolled_back':
        return res.status(502).json({
          error: 'transfer_failed_rolled_back',
          message: 'Falló el crédito al receiver; el débito fue revertido. No se perdió dinero.',
          transaction_id: txId,
          status: 'ROLLED_BACK',
        })
      case 'compensation_failed':
        return res.status(500).json({
          error: 'transfer_failed_pending_reconciliation',
          message: 'Falló el crédito y la compensación; el job de reconciliación lo resolverá.',
          transaction_id: txId,
          status: 'DEBITED',
        })
      case 'service_unavailable':
        return res.status(503).json({
          error: 'accounts_service_unavailable',
          message: 'El servicio de cuentas no está disponible',
          transaction_id: txId,
        })
      default:
        return res.status(502).json({
          error: 'transfer_failed',
          message: 'La transferencia no pudo completarse',
          transaction_id: txId,
          reason: result.reason,
        })
    }
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------
// Helper: arma el historial unificado de un usuario
// (transferencias enviadas/recibidas + recargas), con nombres de la
// contraparte y orden cronológico descendente.
// ---------------------------------------------------------------------
async function buildHistory(userId, { limit, offset }) {
  const txs = await repo.listByUser(userId, { limit, offset })

  // Resolver nombres de las contrapartes (una sola consulta por id único).
  const counterpartyIds = new Set()
  for (const t of txs) {
    counterpartyIds.add(t.sender_id === userId ? t.receiver_id : t.sender_id)
  }
  const names = {}
  for (const id of counterpartyIds) {
    const r = await accounts.getUser(id)
    if (r.ok && r.data) names[id] = r.data.name
  }

  const items = txs.map((t) => {
    const isSent = t.sender_id === userId
    const counterpartyId = isSent ? t.receiver_id : t.sender_id
    return {
      transaction_id: t.id,
      type: isSent ? 'sent' : 'received',
      amount: roundMoney(t.amount),
      amount_formatted: formatMoney(t.amount),
      status: t.status,
      counterparty_id: counterpartyId,
      counterparty_name: names[counterpartyId] || `Usuario ${counterpartyId}`,
      created_at: t.created_at,
    }
  })

  // Incluir recargas (viven en el ledger de accounts-service).
  const ledger = await accounts.getLedger(userId)
  if (ledger.ok && ledger.data && Array.isArray(ledger.data.entries)) {
    for (const e of ledger.data.entries) {
      if (e.operation !== 'recharge') continue
      items.push({
        transaction_id: null,
        type: 'recharge',
        amount: roundMoney(e.amount),
        amount_formatted: formatMoney(e.amount),
        status: 'COMPLETED',
        counterparty_id: null,
        counterparty_name: e.reference || 'Recarga',
        created_at: e.created_at,
      })
    }
  }

  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return items
}

// ---------------------------------------------------------------------
// RF-005 · GET /api/transactions/:id  — Historial de transacciones (bonus)
// ---------------------------------------------------------------------
async function getHistory(req, res, next) {
  // El historial es SIEMPRE el del usuario autenticado.
  const userId = req.user.id
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const offset = Number(req.query.offset) || 0
  try {
    const user = await accounts.getUser(userId)
    if (user.status === 404) return res.status(404).json({ error: 'user_not_found' })

    const items = await buildHistory(userId, { limit, offset })
    return res.json({
      user_id: userId,
      count: items.length,
      limit,
      offset,
      transactions: items,
    })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------
// POST /api/transactions/:id/statement  — Enviar historial por correo (extra)
// ---------------------------------------------------------------------
async function emailStatement(req, res, next) {
  const userId = req.user.id
  try {
    const user = await accounts.getUser(userId)
    if (user.status === 404) return res.status(404).json({ error: 'user_not_found' })
    if (!user.ok) return res.status(503).json({ error: 'accounts_service_unavailable' })

    const items = await buildHistory(userId, { limit: 100, offset: 0 })

    const result = await notifier.notify({
      channel: 'email',
      to: { name: user.data.name, email: user.data.email, phone: user.data.phone },
      template: 'statement',
      data: {
        name: user.data.name,
        balance: formatMoney(user.data.balance),
        transactions: items,
      },
    })

    // El notification-service responde { message, template, email:{...} }.
    const delivery = (result && result.email) ? result.email : { status: 'unknown', note: 'notification-service no respondió' }

    return res.status(200).json({
      message: 'Estado de cuenta enviado por correo',
      user_id: userId,
      email: user.data.email,
      transactions_included: items.length,
      delivery,
    })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------
// POST /api/admin/reconcile  — Dispara la reconciliación manualmente (bonus)
// ---------------------------------------------------------------------
async function reconcileNow(req, res, next) {
  try {
    const summary = await reconciliation.reconcileOnce()
    return res.json({ message: 'Reconciliación ejecutada', ...summary })
  } catch (err) {
    return next(err)
  }
}

module.exports = { transfer, getHistory, emailStatement, reconcileNow, buildHistory }

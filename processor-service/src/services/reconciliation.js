/**
 * Job de reconciliación (bonus · resiliencia).
 *
 * Periódicamente busca transacciones "atascadas" (PENDING/DEBITED viejas) y
 * las resuelve consultando la VERDAD en el libro mayor de accounts-service:
 *
 *   · débito + crédito presentes      -> COMPLETED (se cayó antes de cerrar)
 *   · débito + compensación presentes -> ROLLED_BACK (ya se devolvió)
 *   · débito pero SIN crédito         -> compensar ahora -> ROLLED_BACK
 *   · sin débito                      -> FAILED (nunca movió dinero)
 *
 * Así, ante un crash a mitad de la Saga, el dinero siempre termina
 * cuadrado: ni se pierde ni se duplica.
 */
const repo = require('../repositories/transactionRepo')
const accounts = require('../services/accountsClient')
const { roundMoney } = require('../utils/money')
const logger = require('../config/logger')

const STUCK_SECONDS = Number(process.env.RECONCILE_STUCK_SECONDS) || 30
const INTERVAL_MS = Number(process.env.RECONCILE_INTERVAL_MS) || 15000
const ENABLED = String(process.env.RECONCILE_ENABLED || 'true') === 'true'

let timer = null

/** Resuelve UNA transacción atascada usando el ledger como fuente de verdad. */
async function resolveOne(tx) {
  const txId = tx.id
  const amount = roundMoney(tx.amount)

  const transferLedger = await accounts.getLedgerByReference(`transfer:${txId}`)
  const compLedger = await accounts.getLedgerByReference(`compensation:${txId}`)
  if (!transferLedger.ok || !compLedger.ok) {
    return { txId, action: 'skipped', reason: 'accounts_unavailable' }
  }

  const entries = transferLedger.data.entries || []
  const compEntries = compLedger.data.entries || []
  const hasDebit = entries.some((e) => e.operation === 'debit' && e.user_id === tx.sender_id)
  const hasCredit = entries.some((e) => e.operation === 'credit' && e.user_id === tx.receiver_id)
  const hasComp = compEntries.length > 0

  if (hasDebit && hasCredit) {
    await repo.setStatus(txId, 'COMPLETED', 'reconciled:completed')
    return { txId, action: 'completed' }
  }
  if (hasDebit && hasComp) {
    await repo.setStatus(txId, 'ROLLED_BACK', 'reconciled:already_compensated')
    return { txId, action: 'rolled_back' }
  }
  if (hasDebit && !hasCredit) {
    const refund = await accounts.updateBalance(tx.sender_id, amount, 'credit', `compensation:${txId}`)
    if (!refund.ok) {
      logger.error('reconciliacion: compensacion fallida', { transaction_id: txId })
      return { txId, action: 'compensation_failed' }
    }
    logger.warn('reconciliacion: transaccion compensada', { transaction_id: txId, amount })
    await repo.setStatus(txId, 'ROLLED_BACK', 'reconciled:compensated')
    return { txId, action: 'compensated' }
  }

  // Sin débito registrado: nunca se movió dinero.
  await repo.setStatus(txId, 'FAILED', 'reconciled:no_debit_timeout')
  return { txId, action: 'failed' }
}

/** Pasa una vez por todas las transacciones atascadas. */
async function reconcileOnce() {
  const stuck = await repo.findStuck(STUCK_SECONDS)
  const results = []
  for (const tx of stuck) {
    try {
      results.push(await resolveOne(tx))
    } catch (err) {
      logger.error('reconciliacion: error inesperado', { transaction_id: tx.id, msg: err.message })
      results.push({ txId: tx.id, action: 'error' })
    }
  }
  if (results.length) {
    logger.info('reconciliacion ejecutada', { revisadas: stuck.length, resultados: results })
  }
  return { checked: stuck.length, results }
}

/** Arranca el job periódico (si está habilitado). */
function start() {
  if (!ENABLED) {
    logger.info('reconciliacion deshabilitada (RECONCILE_ENABLED=false)')
    return
  }
  timer = setInterval(() => {
    reconcileOnce().catch((err) => logger.error('reconciliacion: loop', { msg: err.message }))
  }, INTERVAL_MS)
  timer.unref()
  logger.info('reconciliacion activa', { interval_ms: INTERVAL_MS, stuck_seconds: STUCK_SECONDS })
}

function stop() {
  if (timer) clearInterval(timer)
}

module.exports = { reconcileOnce, resolveOne, start, stop }

/**
 * Orquestador de la Saga de transferencia P2P (RF-003 · CU-001/CU-005).
 *
 * Coordina pasos distribuidos contra accounts-service vía HTTP y garantiza
 * la regla CRÍTICA: NUNCA se pierde dinero. Si el crédito al receiver falla
 * tras haber debitado al sender, se ejecuta una COMPENSACIÓN que devuelve el
 * dinero al sender (estado ROLLED_BACK).
 *
 * Pasos:
 *   1. Verificar que el sender exista.
 *   2. Verificar que el receiver exista.
 *   3. Verificar fondos suficientes (el débito los revalida atómicamente).
 *   4. Debitar al sender            -> DEBITED
 *   5. Acreditar al receiver        -> COMPLETED
 *      5b. Si falla: compensar (devolver al sender) -> ROLLED_BACK
 *          Si la compensación TAMBIÉN falla: dejar DEBITED para reconciliar.
 *
 * Devuelve un objeto { outcome, ... } que el controlador mapea a HTTP.
 */
const accounts = require('../services/accountsClient')
const repo = require('../repositories/transactionRepo')
const { nextState } = require('./sagaState')
const { roundMoney } = require('../utils/money')
const logger = require('../config/logger')

async function execute(tx) {
  const txId = tx.id
  const amount = roundMoney(tx.amount)
  const senderId = tx.sender_id
  const receiverId = tx.receiver_id
  const log = (msg, meta) => logger.info(msg, { transaction_id: txId, ...meta })

  // --- Paso 1: el sender debe existir -------------------------------
  const senderRes = await accounts.getUser(senderId)
  if (senderRes.status === 404) {
    const t = await repo.setStatus(txId, nextState('PENDING', 'abort'), 'user_not_found:sender')
    return { outcome: 'user_not_found', who: 'sender', transaction: t }
  }
  if (!senderRes.ok) {
    const t = await repo.setStatus(txId, nextState('PENDING', 'abort'), 'accounts_unavailable:sender')
    return { outcome: 'service_unavailable', transaction: t }
  }
  const sender = senderRes.data

  // --- Paso 2: el receiver debe existir -----------------------------
  const receiverRes = await accounts.getUser(receiverId)
  if (receiverRes.status === 404) {
    const t = await repo.setStatus(txId, nextState('PENDING', 'abort'), 'user_not_found:receiver')
    return { outcome: 'user_not_found', who: 'receiver', transaction: t }
  }
  if (!receiverRes.ok) {
    const t = await repo.setStatus(txId, nextState('PENDING', 'abort'), 'accounts_unavailable:receiver')
    return { outcome: 'service_unavailable', transaction: t }
  }
  const receiver = receiverRes.data

  // --- Paso 3: fondos suficientes (chequeo temprano) ----------------
  if (roundMoney(sender.balance) < amount) {
    const t = await repo.setStatus(txId, nextState('PENDING', 'abort'), 'insufficient_funds')
    return { outcome: 'insufficient_funds', transaction: t, balance: roundMoney(sender.balance), sender, receiver }
  }

  // --- Paso 4: DÉBITO al sender -------------------------------------
  const debit = await accounts.updateBalance(senderId, amount, 'debit', `transfer:${txId}`)
  if (!debit.ok) {
    // Carrera: pudo quedarse sin fondos entre el chequeo y el débito.
    if (debit.status === 400 && debit.data && debit.data.error === 'insufficient_funds') {
      const t = await repo.setStatus(txId, nextState('PENDING', 'debit_fail'), 'insufficient_funds')
      return { outcome: 'insufficient_funds', transaction: t, balance: debit.data.balance, sender, receiver }
    }
    const t = await repo.setStatus(txId, nextState('PENDING', 'debit_fail'), `debit_failed:${debit.status}`)
    return { outcome: 'failed', transaction: t, reason: 'debit_failed', sender, receiver }
  }
  await repo.setStatus(txId, nextState('PENDING', 'debit_ok')) // -> DEBITED
  log('sender debitado', { amount, sender_balance: debit.data.new_balance })

  // --- Paso 5: CRÉDITO al receiver ----------------------------------
  const credit = await accounts.updateBalance(receiverId, amount, 'credit', `transfer:${txId}`)
  if (!credit.ok) {
    // COMPENSACIÓN: devolver el dinero al sender (no se pierde dinero).
    logger.warn('credito fallido, ejecutando compensacion', { transaction_id: txId, status: credit.status })
    const refund = await accounts.updateBalance(senderId, amount, 'credit', `compensation:${txId}`)
    if (!refund.ok) {
      // CRÍTICO: la compensación falló. Se deja DEBITED para que el job de
      // reconciliación termine el rollback de forma segura.
      await repo.setStatus(txId, 'DEBITED', 'compensation_failed:NEEDS_RECONCILE')
      logger.error('COMPENSACION FALLIDA — requiere reconciliacion', { transaction_id: txId })
      return { outcome: 'compensation_failed', transaction: await repo.findById(txId) }
    }
    const t = await repo.setStatus(txId, nextState('DEBITED', 'credit_fail'), 'credit_failed:rolled_back')
    return { outcome: 'rolled_back', transaction: t, reason: 'credit_failed', sender, receiver }
  }

  // --- Éxito: COMPLETED ---------------------------------------------
  const t = await repo.setStatus(txId, nextState('DEBITED', 'credit_ok'))
  log('transferencia completada', { amount })
  return {
    outcome: 'completed',
    transaction: t,
    sender,
    receiver,
    sender_balance: debit.data.new_balance,
    receiver_balance: credit.data.new_balance,
  }
}

module.exports = { execute }

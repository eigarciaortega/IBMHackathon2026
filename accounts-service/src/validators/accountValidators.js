/**
 * Validadores PUROS del accounts-service (sin dependencias de BD).
 * Concentran las reglas de negocio para poder probarlas con tests unitarios.
 *
 * Reglas cubiertas:
 *  · RN-001 Montos positivos (> 0)
 *  · RN-005 Precisión decimal (máximo 2 decimales)
 *  · RF-004 Operación interna debit/credit
 */
const { isValidAmount } = require('../utils/money')

const OPERATIONS = ['debit', 'credit']
const PAYMENT_METHODS = ['CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CASH']

/** ¿El id de usuario es un entero positivo? (acepta string numérico). */
function isValidUserId(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0
}

/** Valida el cuerpo de una recarga (RF-002). */
function validateRecharge({ user_id, amount, payment_method }) {
  const errors = []
  if (!isValidUserId(user_id)) {
    errors.push({ code: 'INVALID_USER_ID', message: 'user_id debe ser un entero positivo' })
  }
  if (!isValidAmount(amount)) {
    errors.push({ code: 'INVALID_AMOUNT', message: 'El monto debe ser positivo y con máximo 2 decimales' })
  }
  if (payment_method !== undefined && !PAYMENT_METHODS.includes(payment_method)) {
    errors.push({ code: 'INVALID_PAYMENT_METHOD', message: `payment_method debe ser uno de: ${PAYMENT_METHODS.join(', ')}` })
  }
  return { valid: errors.length === 0, errors }
}

/** Valida el cuerpo de un movimiento interno de saldo (RF-004). */
function validateBalanceUpdate({ user_id, amount, operation }) {
  const errors = []
  if (!isValidUserId(user_id)) {
    errors.push({ code: 'INVALID_USER_ID', message: 'user_id debe ser un entero positivo' })
  }
  if (!isValidAmount(amount)) {
    errors.push({ code: 'INVALID_AMOUNT', message: 'El monto debe ser positivo y con máximo 2 decimales' })
  }
  if (!OPERATIONS.includes(operation)) {
    errors.push({ code: 'INVALID_OPERATION', message: "operation debe ser 'debit' o 'credit'" })
  }
  return { valid: errors.length === 0, errors }
}

module.exports = {
  OPERATIONS,
  PAYMENT_METHODS,
  isValidUserId,
  validateRecharge,
  validateBalanceUpdate,
}

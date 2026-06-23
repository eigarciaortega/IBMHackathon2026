/**
 * Validadores PUROS de transferencias (sin BD). Reglas de negocio:
 *  · RN-001 Monto positivo y con <= 2 decimales
 *  · RN-002 No auto-transferencias (sender != receiver)
 *  · IDs de usuario enteros positivos
 */
const { isValidAmount } = require('../utils/money')

function isValidUserId(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0
}

/** Valida el cuerpo de una transferencia P2P (RF-003). */
function validateTransfer({ sender_id, receiver_id, amount }) {
  const errors = []
  if (!isValidUserId(sender_id)) {
    errors.push({ code: 'invalid_sender', message: 'sender_id debe ser un entero positivo' })
  }
  if (!isValidUserId(receiver_id)) {
    errors.push({ code: 'invalid_receiver', message: 'receiver_id debe ser un entero positivo' })
  }
  if (!isValidAmount(amount)) {
    errors.push({ code: 'invalid_amount', message: 'amount debe ser positivo y con máximo 2 decimales' })
  }
  // Solo tiene sentido comparar si ambos ids son válidos.
  if (isValidUserId(sender_id) && isValidUserId(receiver_id) && Number(sender_id) === Number(receiver_id)) {
    errors.push({ code: 'self_transfer_not_allowed', message: 'No puedes transferirte dinero a ti mismo' })
  }
  return { valid: errors.length === 0, errors }
}

module.exports = { isValidUserId, validateTransfer }

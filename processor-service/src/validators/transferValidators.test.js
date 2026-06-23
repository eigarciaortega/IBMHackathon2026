/**
 * Tests unitarios de validación de transferencias (sin BD). npm test
 */
const { test } = require('node:test')
const assert = require('node:assert')
const { validateTransfer, isValidUserId } = require('./transferValidators')

test('transferencia válida pasa (CU-001)', () => {
  const r = validateTransfer({ sender_id: 1, receiver_id: 2, amount: 100 })
  assert.strictEqual(r.valid, true)
})
test('auto-transferencia falla (CU-003 · RN-002)', () => {
  const r = validateTransfer({ sender_id: 1, receiver_id: 1, amount: 100 })
  assert.ok(r.errors.some((e) => e.code === 'self_transfer_not_allowed'))
})
test('monto cero falla', () => {
  const r = validateTransfer({ sender_id: 1, receiver_id: 2, amount: 0 })
  assert.ok(r.errors.some((e) => e.code === 'invalid_amount'))
})
test('monto negativo falla', () => {
  const r = validateTransfer({ sender_id: 1, receiver_id: 2, amount: -50 })
  assert.ok(r.errors.some((e) => e.code === 'invalid_amount'))
})
test('monto con 3 decimales falla (RN-005)', () => {
  const r = validateTransfer({ sender_id: 1, receiver_id: 2, amount: 10.123 })
  assert.ok(r.errors.some((e) => e.code === 'invalid_amount'))
})
test('sender inválido falla', () => {
  const r = validateTransfer({ sender_id: 0, receiver_id: 2, amount: 10 })
  assert.ok(r.errors.some((e) => e.code === 'invalid_sender'))
})
test('isValidUserId acepta string numérico', () => {
  assert.strictEqual(isValidUserId('5'), true)
  assert.strictEqual(isValidUserId('-2'), false)
})

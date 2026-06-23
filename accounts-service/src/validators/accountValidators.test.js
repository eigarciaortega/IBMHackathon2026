/**
 * Tests unitarios del accounts-service (sin BD). Ejecutar: npm test
 * Usa el runner nativo de Node (node:test). Cubre montos, precisión
 * decimal, validación de recargas y de movimientos internos.
 */
const { test } = require('node:test')
const assert = require('node:assert')
const { roundMoney, isValidAmount, formatMoney } = require('../utils/money')
const { validateRecharge, validateBalanceUpdate, isValidUserId } = require('./accountValidators')

// --- money: redondeo y precisión ---
test('roundMoney redondea a 2 decimales', () => {
  assert.strictEqual(roundMoney('100.005'), 100.01)
  assert.strictEqual(roundMoney(0.1 + 0.2), 0.3)
})
test('formatMoney siempre devuelve 2 decimales', () => {
  assert.strictEqual(formatMoney(900), '900.00')
  assert.strictEqual(formatMoney('150.5'), '150.50')
})
test('isValidAmount acepta positivos con <=2 decimales', () => {
  assert.strictEqual(isValidAmount(100), true)
  assert.strictEqual(isValidAmount('0.01'), true)
  assert.strictEqual(isValidAmount(150.5), true)
})
test('isValidAmount rechaza cero, negativos y no numéricos', () => {
  assert.strictEqual(isValidAmount(0), false)
  assert.strictEqual(isValidAmount(-5), false)
  assert.strictEqual(isValidAmount('abc'), false)
  assert.strictEqual(isValidAmount(null), false)
})
test('isValidAmount rechaza más de 2 decimales', () => {
  assert.strictEqual(isValidAmount(10.999), false)
  assert.strictEqual(isValidAmount('1.001'), false)
})

// --- user id ---
test('isValidUserId acepta enteros positivos (incluye string)', () => {
  assert.strictEqual(isValidUserId(1), true)
  assert.strictEqual(isValidUserId('3'), true)
})
test('isValidUserId rechaza 0, negativos y texto', () => {
  assert.strictEqual(isValidUserId(0), false)
  assert.strictEqual(isValidUserId(-1), false)
  assert.strictEqual(isValidUserId('x'), false)
})

// --- recarga (RF-002) ---
test('recarga válida pasa', () => {
  const r = validateRecharge({ user_id: 2, amount: 150.5, payment_method: 'CREDIT_CARD' })
  assert.strictEqual(r.valid, true)
})
test('recarga sin payment_method es válida (usa default luego)', () => {
  const r = validateRecharge({ user_id: 2, amount: 10 })
  assert.strictEqual(r.valid, true)
})
test('recarga con monto negativo falla', () => {
  const r = validateRecharge({ user_id: 2, amount: -1 })
  assert.ok(r.errors.some((e) => e.code === 'INVALID_AMOUNT'))
})
test('recarga con payment_method inválido falla', () => {
  const r = validateRecharge({ user_id: 2, amount: 10, payment_method: 'BITCOIN' })
  assert.ok(r.errors.some((e) => e.code === 'INVALID_PAYMENT_METHOD'))
})

// --- movimiento interno (RF-004) ---
test('update-balance debit válido pasa', () => {
  const r = validateBalanceUpdate({ user_id: 1, amount: 100, operation: 'debit' })
  assert.strictEqual(r.valid, true)
})
test('update-balance con operación inválida falla', () => {
  const r = validateBalanceUpdate({ user_id: 1, amount: 100, operation: 'transfer' })
  assert.ok(r.errors.some((e) => e.code === 'INVALID_OPERATION'))
})

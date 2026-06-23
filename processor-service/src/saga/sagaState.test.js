/**
 * Tests de la máquina de estados Saga (pura, sin BD). Ejecutar: npm test
 */
const { test } = require('node:test')
const assert = require('node:assert')
const { nextState, isTerminal, needsCompensation } = require('./sagaState')

test('camino feliz: PENDING -> DEBITED -> COMPLETED', () => {
  assert.strictEqual(nextState('PENDING', 'debit_ok'), 'DEBITED')
  assert.strictEqual(nextState('DEBITED', 'credit_ok'), 'COMPLETED')
})
test('débito falla: PENDING -> FAILED', () => {
  assert.strictEqual(nextState('PENDING', 'debit_fail'), 'FAILED')
})
test('validación previa aborta: PENDING -> FAILED', () => {
  assert.strictEqual(nextState('PENDING', 'abort'), 'FAILED')
})
test('crédito falla tras debitar: DEBITED -> ROLLED_BACK (compensación)', () => {
  assert.strictEqual(nextState('DEBITED', 'credit_fail'), 'ROLLED_BACK')
})
test('transición inválida lanza error', () => {
  assert.throws(() => nextState('COMPLETED', 'debit_ok'))
  assert.throws(() => nextState('PENDING', 'credit_ok'))
})
test('estados terminales se reconocen', () => {
  assert.strictEqual(isTerminal('COMPLETED'), true)
  assert.strictEqual(isTerminal('FAILED'), true)
  assert.strictEqual(isTerminal('ROLLED_BACK'), true)
  assert.strictEqual(isTerminal('PENDING'), false)
  assert.strictEqual(isTerminal('DEBITED'), false)
})
test('solo DEBITED requiere compensación', () => {
  assert.strictEqual(needsCompensation('DEBITED'), true)
  assert.strictEqual(needsCompensation('PENDING'), false)
  assert.strictEqual(needsCompensation('COMPLETED'), false)
})

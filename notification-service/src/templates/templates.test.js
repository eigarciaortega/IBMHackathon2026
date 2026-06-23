/**
 * Tests de las plantillas (puras, sin red ni BD). npm test
 */
const { test } = require('node:test')
const assert = require('node:assert')
const { render } = require('./templates')

test('recharge genera SMS y correo con el monto', () => {
  const r = render('recharge', { amount: '150.00', payment_method: 'CREDIT_CARD', new_balance: '200.00' })
  assert.match(r.sms, /150\.00/)
  assert.match(r.sms, /CREDIT_CARD/)
  assert.match(r.subject, /Recarga/)
  assert.match(r.html, /Nuevo saldo/)
})

test('transfer_sent incluye contraparte y folio', () => {
  const r = render('transfer_sent', { amount: '100.00', counterparty: 'Usuario B', transaction_id: 42, new_balance: '900.00' })
  assert.match(r.sms, /Usuario B/)
  assert.match(r.sms, /#42/)
})

test('transfer_received marca dinero recibido', () => {
  const r = render('transfer_received', { amount: '100.00', counterparty: 'Usuario A', transaction_id: 42, new_balance: '150.00' })
  assert.match(r.sms, /Recibiste/)
})

test('statement es solo-correo (sms null) y arma la tabla', () => {
  const r = render('statement', {
    name: 'Usuario A',
    balance: '900.00',
    transactions: [
      { type: 'sent', counterparty_name: 'Usuario B', amount_formatted: '100.00', created_at: new Date().toISOString() },
      { type: 'recharge', counterparty_name: 'recharge:CREDIT_CARD', amount_formatted: '500.00', created_at: new Date().toISOString() },
    ],
  })
  assert.strictEqual(r.sms, null)
  assert.match(r.html, /Estado de cuenta/)
  assert.match(r.html, /Usuario B/)
})

test('statement sin movimientos no rompe', () => {
  const r = render('statement', { name: 'Nuevo', balance: '0.00', transactions: [] })
  assert.match(r.html, /Sin movimientos/)
})

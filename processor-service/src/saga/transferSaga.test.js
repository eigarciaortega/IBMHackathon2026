/**
 * Tests de ORQUESTACIÓN de la Saga (transferSaga.execute) con dobles de
 * prueba. Se reemplazan en caliente las funciones de accountsClient y del
 * repositorio para no tocar HTTP ni la base de datos: así verificamos la
 * coreografía completa (débito → crédito → compensación) de forma aislada.
 *
 * Ejecutar: npm test
 */
const { test } = require('node:test')
const assert = require('node:assert')

const accounts = require('../services/accountsClient')
const repo = require('../repositories/transactionRepo')
const saga = require('./transferSaga')

const TX = { id: 7, sender_id: 1, receiver_id: 2, amount: 100 }

function userOk(id, balance) {
  return { ok: true, status: 200, data: { id, name: `U${id}`, email: `u${id}@x.com`, phone: `+10${id}`, balance } }
}

/** Configura los dobles y devuelve el registro de llamadas. */
function harness({ sender, receiver, debit, credit, refund }) {
  const calls = { statuses: [], updates: [] }
  accounts.getUser = async (id) => (id === TX.sender_id ? sender : receiver)
  accounts.updateBalance = async (id, amount, op, ref) => {
    calls.updates.push({ id, op, ref })
    if (op === 'debit') return debit
    if (ref && ref.startsWith('compensation:')) return refund
    return credit
  }
  repo.setStatus = async (id, status, err) => {
    calls.statuses.push(status)
    return { id, status, error_message: err }
  }
  repo.findById = async (id) => ({ id, status: 'DEBITED' })
  return calls
}

test('camino feliz -> COMPLETED y ambos saldos reportados', async () => {
  const calls = harness({
    sender: userOk(1, 1000),
    receiver: userOk(2, 50),
    debit: { ok: true, status: 200, data: { new_balance: 900 } },
    credit: { ok: true, status: 200, data: { new_balance: 150 } },
  })
  const r = await saga.execute(TX)
  assert.strictEqual(r.outcome, 'completed')
  assert.strictEqual(r.sender_balance, 900)
  assert.strictEqual(r.receiver_balance, 150)
  assert.deepStrictEqual(calls.statuses, ['DEBITED', 'COMPLETED'])
})

test('fondos insuficientes (chequeo previo) -> sin mover dinero', async () => {
  const calls = harness({
    sender: userOk(1, 30),
    receiver: userOk(2, 50),
    debit: { ok: false },
    credit: { ok: false },
  })
  const r = await saga.execute(TX)
  assert.strictEqual(r.outcome, 'insufficient_funds')
  assert.strictEqual(calls.updates.length, 0) // nunca se llamó a debit/credit
  assert.deepStrictEqual(calls.statuses, ['FAILED'])
})

test('sender inexistente -> user_not_found (who: sender)', async () => {
  harness({
    sender: { ok: false, status: 404 },
    receiver: userOk(2, 50),
    debit: { ok: false },
    credit: { ok: false },
  })
  const r = await saga.execute(TX)
  assert.strictEqual(r.outcome, 'user_not_found')
  assert.strictEqual(r.who, 'sender')
})

test('receiver inexistente -> user_not_found (who: receiver)', async () => {
  harness({
    sender: userOk(1, 1000),
    receiver: { ok: false, status: 404 },
    debit: { ok: false },
    credit: { ok: false },
  })
  const r = await saga.execute(TX)
  assert.strictEqual(r.outcome, 'user_not_found')
  assert.strictEqual(r.who, 'receiver')
})

test('falla el crédito pero la compensación OK -> ROLLED_BACK (no se pierde dinero)', async () => {
  const calls = harness({
    sender: userOk(1, 1000),
    receiver: userOk(2, 50),
    debit: { ok: true, status: 200, data: { new_balance: 900 } },
    credit: { ok: false, status: 503 },
    refund: { ok: true, status: 200, data: { new_balance: 1000 } },
  })
  const r = await saga.execute(TX)
  assert.strictEqual(r.outcome, 'rolled_back')
  // Hubo débito, intento de crédito y compensación al sender.
  const compensation = calls.updates.find((u) => u.ref && u.ref.startsWith('compensation:'))
  assert.ok(compensation, 'debe existir una compensación al sender')
  assert.deepStrictEqual(calls.statuses, ['DEBITED', 'ROLLED_BACK'])
})

test('falla crédito Y compensación -> compensation_failed (queda DEBITED para reconciliar)', async () => {
  harness({
    sender: userOk(1, 1000),
    receiver: userOk(2, 50),
    debit: { ok: true, status: 200, data: { new_balance: 900 } },
    credit: { ok: false, status: 503 },
    refund: { ok: false, status: 503 },
  })
  const r = await saga.execute(TX)
  assert.strictEqual(r.outcome, 'compensation_failed')
})

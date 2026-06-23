/**
 * Tests unitarios del motor de reglas (sin BD). Ejecutar: npm test
 * Cubre los edge cases del Brief: el "abrazo", consecutivas, capacidad, fecha.
 */
const assert = require('node:assert')
const { rangesOverlap, validateBooking } = require('./bookingValidators')

let passed = 0
const tests = []
function test(name, fn) { tests.push({ name, fn }) }

const FUTURE = '2999-01-01' // siempre en el futuro
const NOW = new Date('2026-06-22T08:00:00')

// --- Solapamiento (minutos) ---
test('consecutivas NO se solapan (10-11 y 11-12)', () => {
  assert.strictEqual(rangesOverlap(600, 660, 660, 720), false)
})
test('el "abrazo" SÍ se solapa (9-12 envuelve 10-11)', () => {
  assert.strictEqual(rangesOverlap(540, 720, 600, 660), true)
})
test('solapamiento parcial 9:30-10:30 vs 9-10', () => {
  assert.strictEqual(rangesOverlap(570, 630, 540, 600), true)
})
test('mismo horario exacto se solapa', () => {
  assert.strictEqual(rangesOverlap(540, 600, 540, 600), true)
})
test('rangos disjuntos no se solapan', () => {
  assert.strictEqual(rangesOverlap(540, 600, 720, 780), false)
})

// --- Reglas de negocio ---
test('reserva válida pasa', () => {
  const r = validateBooking({ date: FUTURE, start: '09:00', end: '10:00', attendees: 4, capacity: 8, now: NOW })
  assert.strictEqual(r.valid, true)
})
test('capacidad excedida (10 en sala de 8)', () => {
  const r = validateBooking({ date: FUTURE, start: '09:00', end: '10:00', attendees: 10, capacity: 8, now: NOW })
  assert.ok(r.errors.some((e) => e.code === 'CAPACIDAD_EXCEDIDA'))
})
test('fin menor que inicio (11->09) falla', () => {
  const r = validateBooking({ date: FUTURE, start: '11:00', end: '09:00', attendees: 1, capacity: 8, now: NOW })
  assert.ok(r.errors.some((e) => e.code === 'ORDEN_HORARIO'))
})
test('fin igual a inicio falla', () => {
  const r = validateBooking({ date: FUTURE, start: '09:00', end: '09:00', attendees: 1, capacity: 8, now: NOW })
  assert.ok(r.errors.some((e) => e.code === 'ORDEN_HORARIO'))
})
test('fecha en el pasado falla', () => {
  const r = validateBooking({ date: '2020-01-01', start: '09:00', end: '10:00', attendees: 1, capacity: 8, now: NOW })
  assert.ok(r.errors.some((e) => e.code === 'FECHA_PASADA'))
})
test('asistentes cero falla', () => {
  const r = validateBooking({ date: FUTURE, start: '09:00', end: '10:00', attendees: 0, capacity: 8, now: NOW })
  assert.ok(r.errors.some((e) => e.code === 'ASISTENTES_INVALIDOS'))
})
test('formato de hora inválido falla', () => {
  const r = validateBooking({ date: FUTURE, start: '9am', end: '10:00', attendees: 1, capacity: 8, now: NOW })
  assert.ok(r.errors.some((e) => e.code === 'HORA_INICIO_INVALIDA'))
})

for (const { name, fn } of tests) {
  try { fn(); passed++; console.log(`  ✓ ${name}`) }
  catch (e) { console.error(`  ✗ ${name}\n     ${e.message}`); process.exitCode = 1 }
}
console.log(`\n${passed}/${tests.length} tests OK`)

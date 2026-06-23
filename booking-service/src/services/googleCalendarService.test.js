/**
 * Tests unitarios del constructor de eventos de Google Calendar (sin red).
 * Ejecutar: node src/services/googleCalendarService.test.js
 */
const assert = require('node:assert')
const { buildEventResource, getEmbedConfig } = require('./googleCalendarService')

let passed = 0
const tests = []
const test = (name, fn) => tests.push({ name, fn })

const space = { name: 'Sala Watson', floor: 'Piso 3', location: 'Ala Norte' }
const booking = {
  id: 7,
  title: 'Daily',
  booking_date: '2026-06-23',
  start_time: '09:00:00',
  end_time: '10:00:00',
  attendees: 6,
}

test('el título incluye espacio y motivo', () => {
  const ev = buildEventResource(booking, space, { full_name: 'Carlos', role: 'COLABORADOR' })
  assert.strictEqual(ev.summary, 'Sala Watson — Daily')
})

test('las horas usan formato local + timeZone', () => {
  const ev = buildEventResource(booking, space, { full_name: 'Carlos', role: 'COLABORADOR' })
  assert.strictEqual(ev.start.dateTime, '2026-06-23T09:00:00')
  assert.strictEqual(ev.end.dateTime, '2026-06-23T10:00:00')
  assert.ok(ev.start.timeZone && ev.end.timeZone)
})

test('el color distingue admin de colaborador', () => {
  const admin = buildEventResource(booking, space, { full_name: 'Admin', role: 'ADMINISTRADOR' })
  const collab = buildEventResource(booking, space, { full_name: 'Carlos', role: 'COLABORADOR' })
  assert.notStrictEqual(admin.colorId, collab.colorId)
})

test('la descripción identifica al organizador', () => {
  const ev = buildEventResource(booking, space, { full_name: 'Ana Torres', role: 'COLABORADOR' })
  assert.ok(ev.description.includes('Ana Torres'))
  assert.ok(ev.description.includes('Colaborador'))
})

test('guarda el id de reserva en propiedades extendidas', () => {
  const ev = buildEventResource(booking, space, { full_name: 'Ana', role: 'COLABORADOR' })
  assert.strictEqual(ev.extendedProperties.private.officespaceBookingId, '7')
})

test('getEmbedConfig devuelve la forma esperada', () => {
  const cfg = getEmbedConfig()
  assert.strictEqual(typeof cfg.configured, 'boolean')
  assert.ok('embedUrl' in cfg)
  assert.ok('timeZone' in cfg)
  assert.ok('calendarId' in cfg)
})

for (const { name, fn } of tests) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    console.error(`  ✗ ${name}\n     ${e.message}`)
    process.exitCode = 1
  }
}
console.log(`\n${passed}/${tests.length} tests OK`)

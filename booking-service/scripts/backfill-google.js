/**
 * Backfill de Google Calendar.
 *
 * Empuja a Google Calendar las reservas CONFIRMADA que todavía no tienen evento
 * (google_event_id NULL). Útil para que el calendario embebido no aparezca vacío
 * en la demo, o tras configurar las credenciales con reservas ya existentes.
 *
 *   cd booking-service
 *   npm run backfill:google      (o: node scripts/backfill-google.js)
 *
 * Requiere las variables GOOGLE_* configuradas (ver GOOGLE_CALENDAR_SETUP.md).
 */
require('dotenv').config()
const { pool, query } = require('../src/config/db')
const { backfillConfirmedBookings, isSyncConfigured } = require('../src/services/googleCalendarService')

async function main() {
  if (!isSyncConfigured()) {
    console.error(
      'Google Calendar no está configurado. Revisa GOOGLE_CALENDAR_ID y la clave de la cuenta de servicio.',
    )
    process.exit(1)
  }

  const result = await backfillConfirmedBookings(query)
  console.log(`Reservas a sincronizar: ${result.total}`)
  console.log(`\nListo. ${result.created}/${result.total} eventos creados en Google Calendar.`)
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

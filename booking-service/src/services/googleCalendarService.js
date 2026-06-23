/**
 * Servicio de sincronización con Google Calendar (vía cuenta de servicio).
 *
 * Principios de diseño:
 *  - Degradación elegante: si NO hay credenciales configuradas, todas las
 *    operaciones se omiten en silencio. Una reserva nunca falla porque Google
 *    no esté disponible: la sincronización es "mejor esfuerzo" (igual que el
 *    correo SMTP o WhatsApp de reminderService).
 *  - `googleapis` se carga de forma perezosa: solo se requiere cuando la
 *    integración está encendida. Así el constructor de eventos se puede
 *    probar de forma aislada sin instalar la dependencia.
 */
const fs = require('fs')

// Zona horaria de los eventos (reutiliza la del servicio de recordatorios).
const TIMEZONE =
  process.env.GOOGLE_CALENDAR_TIMEZONE || process.env.BOOKING_TIMEZONE || 'America/Mexico_City'
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || ''
const EMBED_URL_OVERRIDE = process.env.GOOGLE_CALENDAR_EMBED_URL || ''

// Colores de evento de Google (1..11) para distinguir quién reservó.
const COLOR_ADMIN = process.env.GOOGLE_EVENT_COLOR_ADMIN || '11' // "Tomate" (rojo)
const COLOR_COLLABORATOR = process.env.GOOGLE_EVENT_COLOR_COLLABORATOR || '9' // "Arándano" (azul)

const SCOPES = ['https://www.googleapis.com/auth/calendar.events']

function isoDate(value) {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function timePart(value) {
  return String(value || '').slice(0, 5)
}

function roleLabel(role) {
  return role === 'ADMINISTRADOR' ? 'Administración' : 'Colaborador'
}

/**
 * Carga la clave de la cuenta de servicio desde:
 *   1) GOOGLE_SERVICE_ACCOUNT_KEY     -> JSON crudo o base64 (ideal para Docker)
 *   2) GOOGLE_SERVICE_ACCOUNT_KEY_FILE -> ruta a un archivo .json
 * Devuelve null si no hay ninguna configurada.
 */
function loadServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (raw && raw.trim()) {
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    return JSON.parse(text)
  }
  const file = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE
  if (file && fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  }
  return null
}

/** ¿Está lista la sincronización? (calendario + credenciales presentes) */
function isSyncConfigured() {
  return Boolean(CALENDAR_ID) && Boolean(loadServiceAccount())
}

/**
 * URL para embeber el calendario de Google en la página (vista de mes).
 * El iframe solo muestra eventos si el calendario es público o compartido.
 */
function getEmbedConfig() {
  const embedUrl =
    EMBED_URL_OVERRIDE ||
    (CALENDAR_ID
      ? `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(
          CALENDAR_ID,
        )}&ctz=${encodeURIComponent(TIMEZONE)}&mode=MONTH`
      : '')
  return {
    configured: Boolean(embedUrl),
    embedUrl,
    timeZone: TIMEZONE,
    calendarId: CALENDAR_ID || null,
  }
}

/**
 * Construye el recurso de evento de Google a partir de una reserva.
 * Función PURA (sin red ni googleapis): testeable de forma aislada.
 */
function buildEventResource(booking, space, user) {
  const date = isoDate(booking.booking_date)
  const start = timePart(booking.start_time)
  const end = timePart(booking.end_time)
  const role = user && user.role
  const location = [space && space.floor, space && space.location].filter(Boolean).join(' · ')
  return {
    summary: `${(space && space.name) || 'Espacio'} — ${booking.title || 'Reserva'}`,
    description: [
      'Reserva de IBM OfficeSpace',
      `Organizador: ${(user && user.full_name) || 'N/D'} (${roleLabel(role)})`,
      `Asistentes: ${booking.attendees}`,
      `Reserva #${booking.id}`,
    ].join('\n'),
    location,
    start: { dateTime: `${date}T${start}:00`, timeZone: TIMEZONE },
    end: { dateTime: `${date}T${end}:00`, timeZone: TIMEZONE },
    // Color distinto según el rol de quien reservó (admin vs colaborador).
    colorId: role === 'ADMINISTRADOR' ? COLOR_ADMIN : COLOR_COLLABORATOR,
    // Guardamos el id de reserva para poder reconciliar si hiciera falta.
    extendedProperties: { private: { officespaceBookingId: String(booking.id) } },
  }
}

let cachedClient = null

/** Cliente autenticado de Google Calendar (carga perezosa + caché). */
async function getCalendarClient() {
  if (cachedClient) return cachedClient
  const credentials = loadServiceAccount()
  if (!credentials) return null
  // Solo aquí se requiere googleapis: si la integración está apagada, ni se carga.
  const { google } = require('googleapis')
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: SCOPES,
  })
  await auth.authorize()
  cachedClient = google.calendar({ version: 'v3', auth })
  return cachedClient
}

/** Crea el evento de la reserva en el calendario compartido. */
async function createEvent(booking, space, user) {
  if (!isSyncConfigured()) return { skipped: true, reason: 'GOOGLE_NOT_CONFIGURED' }
  const calendar = await getCalendarClient()
  if (!calendar) return { skipped: true, reason: 'GOOGLE_NOT_CONFIGURED' }
  const { data } = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: buildEventResource(booking, space, user),
  })
  return { eventId: data.id, htmlLink: data.htmlLink }
}

/** Elimina el evento asociado a una reserva cancelada. */
async function deleteEvent(eventId) {
  if (!eventId || !isSyncConfigured()) return { skipped: true }
  const calendar = await getCalendarClient()
  if (!calendar) return { skipped: true }
  await calendar.events.delete({ calendarId: CALENDAR_ID, eventId })
  return { deleted: true }
}

/**
 * Sincroniza reservas confirmadas previas que aún no tengan evento en Google.
 * `query` debe ser la función de consulta del pool compartido.
 */
async function backfillConfirmedBookings(query) {
  if (!isSyncConfigured()) return { skipped: true, reason: 'GOOGLE_NOT_CONFIGURED' }
  if (typeof query !== 'function') {
    throw new TypeError('backfillConfirmedBookings requiere una función query')
  }

  const { rows } = await query(
    `SELECT b.*, s.name AS s_name, s.floor AS s_floor, s.location AS s_location,
            u.full_name, u.role
       FROM bookings b
       JOIN spaces s ON s.id = b.space_id
       JOIN users u ON u.id = b.user_id
      WHERE b.status = 'CONFIRMADA' AND b.google_event_id IS NULL
      ORDER BY b.booking_date, b.start_time`,
  )

  let created = 0
  let skipped = 0
  let failed = 0

  for (const booking of rows) {
    const space = { name: booking.s_name, floor: booking.s_floor, location: booking.s_location }
    const user = { full_name: booking.full_name, role: booking.role }
    try {
      const ev = await createEvent(booking, space, user)
      if (ev && ev.eventId) {
        await query('UPDATE bookings SET google_event_id = $1 WHERE id = $2', [ev.eventId, booking.id])
        created++
      } else {
        skipped++
      }
    } catch (err) {
      failed++
      console.warn('[booking-service] No se pudo sincronizar una reserva histórica con Google Calendar:', {
        bookingId: booking.id,
        message: err.message,
      })
    }
  }

  return { skipped: false, total: rows.length, created, skippedEvents: skipped, failed }
}

module.exports = {
  isSyncConfigured,
  getEmbedConfig,
  buildEventResource,
  createEvent,
  deleteEvent,
  backfillConfirmedBookings,
  TIMEZONE,
}

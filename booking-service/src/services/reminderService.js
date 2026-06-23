const nodemailer = require('nodemailer')
const { pool, query } = require('../config/db')

const DEFAULT_TIMEZONE = process.env.BOOKING_TIMEZONE || 'America/Mexico_City'
const DEFAULT_TZ_OFFSET = process.env.BOOKING_TIMEZONE_OFFSET || '-06:00'
const DEFAULT_LEAD_MINUTES = Number(process.env.REMINDER_LEAD_MINUTES) || 60
const POLL_INTERVAL_MS = Number(process.env.REMINDER_POLL_INTERVAL_MS) || 60000
const MAX_BATCH_SIZE = Number(process.env.REMINDER_BATCH_SIZE) || 25

const CHANNELS = {
  EMAIL: 'EMAIL',
  WHATSAPP: 'WHATSAPP',
  GOOGLE_CALENDAR: 'GOOGLE_CALENDAR',
  OUTLOOK_CALENDAR: 'OUTLOOK_CALENDAR',
}

const REMINDER_STATUSES = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  PARTIAL: 'PARTIAL',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
}

const DELIVERY_STATUSES = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  SKIPPED: 'SKIPPED',
}

function timePart(timeValue) {
  return String(timeValue || '').slice(0, 5)
}

function isoDate(value) {
  if (!value) return ''
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  return String(value).slice(0, 10)
}

function parseBookingMoment(dateStr, timeStr) {
  return new Date(`${isoDate(dateStr)}T${timePart(timeStr)}:00${DEFAULT_TZ_OFFSET}`)
}

function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function humanizeBooking(dateStr, startTime, endTime) {
  const date = parseBookingMoment(dateStr, startTime)
  try {
    const formattedDate = new Intl.DateTimeFormat('es-MX', {
      timeZone: DEFAULT_TIMEZONE,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
    return `${formattedDate} · ${timePart(startTime)} - ${timePart(endTime)}`
  } catch {
    return `${isoDate(dateStr)} · ${timePart(startTime)} - ${timePart(endTime)}`
  }
}

function buildReminderLinks({ title, date, start, end, location = '', details = '' }) {
  const startDate = parseBookingMoment(date, start)
  const endDate = parseBookingMoment(date, end)
  const bookingTitle = title || 'Reserva'
  const textParts = [
    'Recordatorio de reserva',
    bookingTitle,
    `Fecha: ${isoDate(date)}`,
    `Horario: ${timePart(start)} - ${timePart(end)}`,
    location ? `Ubicación: ${location}` : '',
    details ? `Detalle: ${details}` : '',
  ].filter(Boolean)
  const text = encodeURIComponent(textParts.join('\n'))
  const encodedTitle = encodeURIComponent(bookingTitle)
  const encodedLocation = encodeURIComponent(location)
  const encodedDetails = encodeURIComponent(details || textParts.join('\n'))
  return {
    whatsapp: `https://wa.me/?text=${text}`,
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${utcStamp(startDate)}/${utcStamp(endDate)}&details=${encodedDetails}&location=${encodedLocation}&sf=true&output=xml`,
    outlook: `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodedTitle}&body=${encodedDetails}&startdt=${encodeURIComponent(startDate.toISOString())}&enddt=${encodeURIComponent(endDate.toISOString())}&location=${encodedLocation}`,
  }
}

function normalizeChannels(value, { hasPhone = false } = {}) {
  const raw = Array.isArray(value)
    ? value
    : String(value || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)

  const normalized = raw.map((item) => {
    const upper = String(item).trim().toUpperCase().replace(/[\s-]+/g, '_')
    if (upper === 'GOOGLE' || upper === 'GOOGLECALENDAR') return CHANNELS.GOOGLE_CALENDAR
    if (upper === 'OUTLOOK' || upper === 'OUTLOOKCALENDAR') return CHANNELS.OUTLOOK_CALENDAR
    if (upper === 'WHATSAPP' || upper === 'WA') return CHANNELS.WHATSAPP
    if (upper === 'EMAIL' || upper === 'MAIL' || upper === 'CORREO') return CHANNELS.EMAIL
    if (CHANNELS[upper]) return CHANNELS[upper]
    return null
  }).filter(Boolean)

  const defaults = [CHANNELS.EMAIL, CHANNELS.GOOGLE_CALENDAR]
  if (hasPhone && raw.length === 0) defaults.splice(1, 0, CHANNELS.WHATSAPP)
  const list = normalized.length ? normalized : defaults
  return [...new Set(list)]
}

function buildCalendarSummary({ booking, space, user }) {
  const title = booking.title || 'Reserva'
  const location = [space.floor, space.location].filter(Boolean).join(' · ')
  const details = [
    `Reserva: ${title}`,
    `Espacio: ${space.name}`,
    `Usuario: ${user.full_name}`,
    `Horario: ${isoDate(booking.booking_date)} ${timePart(booking.start_time)}-${timePart(booking.end_time)}`,
  ].join('\n')
  return { title, location, details }
}

function buildReminderPayload({ booking, space, user, reminderPhone, reminderChannels }) {
  const channels = normalizeChannels(reminderChannels, { hasPhone: Boolean(reminderPhone) })
  const summary = buildCalendarSummary({ booking, space, user })
  const links = buildReminderLinks({
    title: summary.title,
    date: booking.booking_date,
    start: booking.start_time,
    end: booking.end_time,
    location: summary.location,
    details: summary.details,
  })
  const reminderAt = new Date(parseBookingMoment(booking.booking_date, booking.start_time).getTime() - (DEFAULT_LEAD_MINUTES * 60000))

  return {
    channels,
    reminderAt,
    leadMinutes: DEFAULT_LEAD_MINUTES,
    emailTo: user.email,
    whatsappTo: reminderPhone ? String(reminderPhone).trim() : null,
    title: summary.title,
    location: summary.location,
    details: summary.details,
    googleCalendarUrl: links.google,
    outlookCalendarUrl: links.outlook,
    whatsappLink: links.whatsapp,
    messageText: [
      'Recordatorio de reserva',
      summary.title,
      `Espacio: ${space.name}`,
      `Fecha y hora: ${humanizeBooking(booking.booking_date, booking.start_time, booking.end_time)}`,
      summary.location ? `Ubicación: ${summary.location}` : '',
      'Puedes agregarlo al calendario desde el enlace incluido en el correo.',
    ].filter(Boolean).join('\n'),
  }
}

async function createReminderRecord(client, bookingId, payload) {
  await client.query(
    `INSERT INTO booking_reminders (
       booking_id, reminder_at, lead_minutes, channels, email_to, whatsapp_to,
       google_calendar_url, outlook_calendar_url, status, email_status, whatsapp_status,
       google_calendar_status, attempts, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0, now(), now())`,
    [
      bookingId,
      payload.reminderAt,
      payload.leadMinutes,
      payload.channels,
      payload.emailTo,
      payload.whatsappTo,
      payload.googleCalendarUrl,
      payload.outlookCalendarUrl,
      REMINDER_STATUSES.PENDING,
      payload.channels.includes(CHANNELS.EMAIL) ? DELIVERY_STATUSES.PENDING : DELIVERY_STATUSES.SKIPPED,
      payload.channels.includes(CHANNELS.WHATSAPP) ? DELIVERY_STATUSES.PENDING : DELIVERY_STATUSES.SKIPPED,
      DELIVERY_STATUSES.SENT,
    ],
  )
}

function getMailer() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT) || 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM
  if (!host || !from || !user || !pass) return null
  return nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
    auth: { user, pass },
  })
}

function isHttpAvailable() {
  return typeof fetch === 'function'
}

async function sendEmailNotification({ to, subject, text, html }) {
  const transporter = getMailer()
  if (!transporter) {
    return { status: DELIVERY_STATUSES.NOT_CONFIGURED, skipped: true, reason: 'SMTP no configurado' }
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  })
  return { status: DELIVERY_STATUSES.SENT }
}

async function sendWhatsAppNotification({ to, body }) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM
  if (!sid || !token || !from || !to) {
    return { status: DELIVERY_STATUSES.NOT_CONFIGURED, skipped: true, reason: 'Twilio WhatsApp no configurado' }
  }
  if (!isHttpAvailable()) {
    return { status: DELIVERY_STATUSES.NOT_CONFIGURED, skipped: true, reason: 'fetch no disponible' }
  }
  const payload = new URLSearchParams({
    From: from,
    To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    Body: body,
  })
  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  })
  if (!resp.ok) {
    const raw = await resp.text()
    throw new Error(`Twilio respondió ${resp.status}: ${raw.slice(0, 300)}`)
  }
  return { status: DELIVERY_STATUSES.SENT }
}

function buildNotificationBody(reminder) {
  const lines = [
    'Recordatorio de reserva',
    reminder.title,
    `Espacio: ${reminder.space_name}`,
    `Fecha y hora: ${humanizeBooking(reminder.booking_date, reminder.start_time, reminder.end_time)}`,
    reminder.location ? `Ubicación: ${reminder.location}` : '',
    reminder.google_calendar_url ? `Google Calendar: ${reminder.google_calendar_url}` : '',
    reminder.outlook_calendar_url ? `Outlook Calendar: ${reminder.outlook_calendar_url}` : '',
  ].filter(Boolean)
  return {
    text: lines.join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5">
        <h2 style="margin:0 0 12px">Recordatorio de reserva</h2>
        <p style="margin:0 0 8px"><strong>${escapeHtml(reminder.title)}</strong></p>
        <p style="margin:0 0 8px">Espacio: ${escapeHtml(reminder.space_name)}</p>
        <p style="margin:0 0 8px">Fecha y hora: ${escapeHtml(humanizeBooking(reminder.booking_date, reminder.start_time, reminder.end_time))}</p>
        ${reminder.location ? `<p style="margin:0 0 8px">Ubicación: ${escapeHtml(reminder.location)}</p>` : ''}
        ${reminder.google_calendar_url ? `<p style="margin:0 0 8px"><a href="${escapeHtml(reminder.google_calendar_url)}">Abrir en Google Calendar</a></p>` : ''}
        ${reminder.outlook_calendar_url ? `<p style="margin:0 0 8px"><a href="${escapeHtml(reminder.outlook_calendar_url)}">Abrir en Outlook Calendar</a></p>` : ''}
      </div>
    `,
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function markReminderCancelled(bookingId) {
  await query(
    `UPDATE booking_reminders
     SET status = $2, updated_at = now()
     WHERE booking_id = $1`,
    [bookingId, REMINDER_STATUSES.CANCELLED],
  )
}

async function persistReminderFromBooking(client, { booking, space, user, reminderPhone, reminderChannels }) {
  const payload = buildReminderPayload({ booking, space, user, reminderPhone, reminderChannels })
  await createReminderRecord(client, booking.id, payload)
  return payload
}

async function loadDueReminders(limit = MAX_BATCH_SIZE) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT
         r.booking_id, r.reminder_at, r.lead_minutes, r.channels,
         r.email_to, r.whatsapp_to, r.google_calendar_url, r.outlook_calendar_url,
         r.status, r.email_status, r.whatsapp_status, r.google_calendar_status,
         b.id AS booking_id_real, b.title, b.booking_date, b.start_time, b.end_time, b.status AS booking_status,
         s.name AS space_name, s.floor, s.location,
         u.full_name, u.email
       FROM booking_reminders r
       JOIN bookings b ON b.id = r.booking_id
       JOIN spaces s ON s.id = b.space_id
       JOIN users u ON u.id = b.user_id
       WHERE r.status IN ($1, $2)
         AND r.reminder_at <= now()
         AND b.status = 'CONFIRMADA'
       ORDER BY r.reminder_at ASC
       LIMIT $3
       FOR UPDATE SKIP LOCKED`,
      [REMINDER_STATUSES.PENDING, REMINDER_STATUSES.FAILED, limit],
    )

    if (!rows.length) {
      await client.query('COMMIT')
      return []
    }

    for (const reminder of rows) {
      await client.query(
        `UPDATE booking_reminders
         SET status = $2, attempts = attempts + 1, last_attempt_at = now(), updated_at = now()
         WHERE booking_id = $1`,
        [reminder.booking_id, REMINDER_STATUSES.PROCESSING],
      )
    }

    await client.query('COMMIT')
    return rows
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // No-op: la conexión se cerrará igualmente.
    }
    throw err
  } finally {
    client.release()
  }
}

async function finalizeReminder(reminder, result) {
  const delivered = [result.email, result.whatsapp].some((item) => item === DELIVERY_STATUSES.SENT)
  const failed = [result.email, result.whatsapp].some((item) =>
    [DELIVERY_STATUSES.FAILED, DELIVERY_STATUSES.NOT_CONFIGURED].includes(item),
  )
  const hasDeliveryTargets = reminder.channels.some((item) => [CHANNELS.EMAIL, CHANNELS.WHATSAPP].includes(item))
  const status = delivered && failed
    ? REMINDER_STATUSES.PARTIAL
    : delivered
      ? REMINDER_STATUSES.SENT
      : failed
        ? REMINDER_STATUSES.FAILED
        : hasDeliveryTargets
          ? REMINDER_STATUSES.FAILED
          : REMINDER_STATUSES.SENT

  await query(
    `UPDATE booking_reminders
     SET status = $2,
         email_status = $3,
         whatsapp_status = $4,
         last_error = $5,
         sent_at = CASE WHEN $6 THEN now() ELSE sent_at END,
         updated_at = now()
     WHERE booking_id = $1`,
    [
      reminder.booking_id,
      status,
      result.email,
      result.whatsapp,
      result.error || null,
      delivered,
    ],
  )
}

async function processReminder(reminder) {
  const notification = buildNotificationBody(reminder)
  const result = {
    email: reminder.channels.includes(CHANNELS.EMAIL) ? DELIVERY_STATUSES.PENDING : DELIVERY_STATUSES.SKIPPED,
    whatsapp: reminder.channels.includes(CHANNELS.WHATSAPP) ? DELIVERY_STATUSES.PENDING : DELIVERY_STATUSES.SKIPPED,
    error: null,
  }

  if (reminder.channels.includes(CHANNELS.EMAIL)) {
    try {
      const emailResult = await sendEmailNotification({
        to: reminder.email_to || reminder.email,
        subject: `Recordatorio: ${reminder.title}`,
        text: notification.text,
        html: notification.html,
      })
      result.email = emailResult.status
    } catch (err) {
      result.email = DELIVERY_STATUSES.FAILED
      result.error = err.message
    }
  }

  if (reminder.channels.includes(CHANNELS.WHATSAPP)) {
    try {
      const whatsappResult = await sendWhatsAppNotification({
        to: reminder.whatsapp_to,
        body: notification.text,
      })
      result.whatsapp = whatsappResult.status
    } catch (err) {
      result.whatsapp = DELIVERY_STATUSES.FAILED
      result.error = result.error ? `${result.error} | ${err.message}` : err.message
    }
  }

  await finalizeReminder(reminder, result)
}

let scheduler = null
let schedulerBusy = false

async function runReminderScheduler() {
  if (schedulerBusy) return
  schedulerBusy = true
  try {
    const reminders = await loadDueReminders()
    for (const reminder of reminders) {
      await processReminder(reminder)
    }
  } catch (err) {
    console.error('[booking-service] Error procesando recordatorios', err)
  } finally {
    schedulerBusy = false
  }
}

function startReminderScheduler() {
  if (scheduler) return scheduler
  runReminderScheduler().catch((err) => console.error('[booking-service] recordatorios iniciales fallaron', err))
  scheduler = setInterval(() => {
    runReminderScheduler().catch((err) => console.error('[booking-service] recordatorios fallaron', err))
  }, POLL_INTERVAL_MS)
  return scheduler
}

function stopReminderScheduler() {
  if (scheduler) {
    clearInterval(scheduler)
    scheduler = null
  }
}

module.exports = {
  CHANNELS,
  DELIVERY_STATUSES,
  REMINDER_STATUSES,
  buildReminderPayload,
  buildReminderLinks,
  createReminderRecord,
  persistReminderFromBooking,
  markReminderCancelled,
  startReminderScheduler,
  stopReminderScheduler,
  parseBookingMoment,
  humanizeBooking,
}

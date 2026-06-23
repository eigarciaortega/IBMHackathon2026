/**
 * Controlador del motor de reservas (lógica crítica).
 */
const { validationResult } = require('express-validator')
const { pool, query } = require('../config/db')
const catalogClient = require('../services/catalogClient')
const { validateBooking, timeToMinutes } = require('../validators/bookingValidators')
const {
  buildReminderPayload,
  createReminderRecord,
  markReminderCancelled,
  DELIVERY_STATUSES,
  REMINDER_STATUSES,
} = require('../services/reminderService')

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function listSpacesFromDb({ type, minCapacity } = {}) {
  const conditions = ['active = true']
  const params = []

  if (type) {
    params.push(type)
    conditions.push(`type = $${params.length}`)
  }
  if (minCapacity) {
    params.push(Number(minCapacity))
    conditions.push(`capacity >= $${params.length}`)
  }

  const { rows } = await query(
    `SELECT * FROM spaces WHERE ${conditions.join(' AND ')} ORDER BY type, capacity DESC, name`,
    params,
  )
  return rows
}

async function listSpacesResilient(filters, authHeader) {
  try {
    return { spaces: await catalogClient.listSpaces(filters, authHeader), degraded: false }
  } catch (err) {
    console.warn('[booking-service] catalog-service no disponible, usando fallback local', {
      status: err.status,
      message: err.message,
    })
    return { spaces: await listSpacesFromDb(filters), degraded: true }
  }
}

function markDegraded(res, degraded) {
  if (degraded) {
    res.set('X-Degraded-Mode', 'catalog-service-fallback')
  }
}

/**
 * GET /availability?date&start&end&type&minCapacity
 * Devuelve solo los espacios libres en el rango solicitado.
 * Obtiene los espacios candidatos del catalog-service vía HTTP.
 */
async function searchAvailability(req, res, next) {
  try {
    const { date, start, end, type, minCapacity } = req.query
    if (!date || !start || !end) {
      return res.status(400).json({ error: 'Los parámetros date, start y end son obligatorios' })
    }
    const v = validateBooking({ date, start, end, attendees: 1, capacity: 1 })
    const blocking = v.errors.filter((e) => e.code !== 'CAPACIDAD_EXCEDIDA')
    if (blocking.length) {
      return res.status(400).json({ error: 'Parámetros inválidos', detalles: blocking })
    }

    const { spaces, degraded } = await listSpacesResilient(
      { type, minCapacity },
      req.headers.authorization || '',
    )
    markDegraded(res, degraded)
    const ids = spaces.map((s) => s.id)
    if (!ids.length) return res.json([])

    const occupied = await query(
      `SELECT DISTINCT space_id FROM bookings
       WHERE status = 'CONFIRMADA' AND booking_date = $1 AND space_id = ANY($2::int[])
         AND start_time < $4::time AND end_time > $3::time`,
      [date, ids, start, end],
    )
    const occ = new Set(occupied.rows.map((r) => r.space_id))
    return res.json(spaces.filter((s) => !occ.has(s.id)))
  } catch (err) {
    return next(err)
  }
}

/**
 * POST /bookings  — LÓGICA CRÍTICA
 * Transacción con bloqueo del espacio + validaciones + chequeo de solapamiento.
 * La restricción EXCLUDE de la BD es la garantía final ante concurrencia.
 */
async function createBooking(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: errors.array() })
  }
  const { space_id, booking_date, start_time, end_time, attendees, title, reminder_phone, reminder_channels } = req.body
  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    const sp = await client.query('SELECT * FROM spaces WHERE id = $1 FOR UPDATE', [space_id])
    if (!sp.rows[0]) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Espacio no encontrado' })
    }
    const space = sp.rows[0]
    if (!space.active) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'El espacio no está disponible para reservas' })
    }

    const check = validateBooking({
      date: booking_date,
      start: start_time,
      end: end_time,
      attendees: Number(attendees),
      capacity: space.capacity,
    })
    if (!check.valid) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Validación fallida', detalles: check.errors })
    }

    // Chequeo de solapamiento [inicio, fin) a nivel de aplicación (respuesta 409 clara).
    const overlap = await client.query(
      `SELECT id, start_time, end_time FROM bookings
       WHERE space_id = $1 AND status = 'CONFIRMADA' AND booking_date = $2
         AND start_time < $4::time AND end_time > $3::time
       LIMIT 1`,
      [space_id, booking_date, start_time, end_time],
    )
    if (overlap.rows[0]) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        error: 'El espacio ya está reservado en ese intervalo de horario',
        conflicto: overlap.rows[0],
      })
    }

    const ins = await client.query(
      `INSERT INTO bookings (space_id, user_id, title, booking_date, start_time, end_time, attendees)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [space_id, req.user.sub, title || 'Reserva', booking_date, start_time, end_time, Number(attendees)],
    )
    const reminderPlan = buildReminderPayload({
      booking: ins.rows[0],
      space,
      user: req.user,
      reminderPhone: reminder_phone,
      reminderChannels: reminder_channels,
    })
    await createReminderRecord(client, ins.rows[0].id, reminderPlan)
    await client.query('COMMIT')
    return res.status(201).json({
      ...ins.rows[0],
      reminder: {
        booking_id: ins.rows[0].id,
        status: REMINDER_STATUSES.PENDING,
        reminder_at: reminderPlan.reminderAt,
        lead_minutes: reminderPlan.leadMinutes,
        channels: reminderPlan.channels,
        email_to: reminderPlan.emailTo,
        whatsapp_to: reminderPlan.whatsappTo,
        whatsapp_link: reminderPlan.whatsappLink,
        google_calendar_url: reminderPlan.googleCalendarUrl,
        outlook_calendar_url: reminderPlan.outlookCalendarUrl,
        email_status: reminderPlan.channels.includes('EMAIL') ? DELIVERY_STATUSES.PENDING : DELIVERY_STATUSES.SKIPPED,
        whatsapp_status: reminderPlan.channels.includes('WHATSAPP') ? DELIVERY_STATUSES.PENDING : DELIVERY_STATUSES.SKIPPED,
        google_calendar_status: DELIVERY_STATUSES.SENT,
      },
    })
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackErr) {
        console.error('[booking-service] No se pudo revertir la transacción', rollbackErr)
      }
    }
    if (err.code === '23P01') {
      // exclusion_violation: la restricción de la BD detectó un solapamiento (race condition)
      return res.status(409).json({ error: 'El espacio ya está reservado en ese intervalo de horario' })
    }
    if (err.code === '23503') {
      return res.status(401).json({ error: 'Usuario no existe o fue eliminado' })
    }
    return next(err)
  } finally {
    if (client) client.release()
  }
}

/** GET /bookings/me — reservas del usuario autenticado */
async function myBookings(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT b.*, s.name AS space_name, s.type AS space_type, s.floor, s.location,
              r.reminder_at, r.lead_minutes, r.channels AS reminder_channels,
              r.email_to AS reminder_email, r.whatsapp_to AS reminder_whatsapp,
              r.status AS reminder_status, r.email_status, r.whatsapp_status,
              r.google_calendar_status, r.google_calendar_url, r.outlook_calendar_url,
              r.last_error AS reminder_last_error, r.sent_at AS reminder_sent_at
       FROM bookings b
       JOIN spaces s ON s.id = b.space_id
       LEFT JOIN booking_reminders r ON r.booking_id = b.id
       WHERE b.user_id = $1
       ORDER BY b.booking_date DESC, b.start_time DESC`,
      [req.user.sub],
    )
    return res.json(rows)
  } catch (err) {
    return next(err)
  }
}

/** DELETE /bookings/:id — cancelar (solo dueño o admin; solo futuras) */
async function cancelBooking(req, res, next) {
  try {
    const id = req.params.id
    const found = await query('SELECT * FROM bookings WHERE id = $1', [id])
    const booking = found.rows[0]
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' })

    if (booking.user_id !== req.user.sub && req.user.role !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'No puedes cancelar reservas de otros usuarios' })
    }
    if (booking.status === 'CANCELADA') {
      return res.status(409).json({ error: 'La reserva ya está cancelada' })
    }
    const bookingDate = booking.booking_date instanceof Date
      ? booking.booking_date.toISOString().slice(0, 10)
      : String(booking.booking_date).slice(0, 10)
    const startsAt = new Date(`${bookingDate}T${String(booking.start_time).slice(0, 5)}:00`)
    if (startsAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Solo se pueden cancelar reservas futuras' })
    }
    await query("UPDATE bookings SET status = 'CANCELADA' WHERE id = $1", [id])
    await markReminderCancelled(id)
    return res.json({ message: 'Reserva cancelada', id: Number(id) })
  } catch (err) {
    return next(err)
  }
}

/** GET /bookings/occupancy?date — ocupación del día (dashboard admin) */
async function occupancy(req, res, next) {
  try {
    const date = req.query.date || todayStr()
    const { rows } = await query(
      `SELECT b.id, b.space_id, b.title, b.booking_date, b.start_time, b.end_time,
              b.attendees, b.status, s.name AS space_name, s.type AS space_type,
              s.floor, s.capacity, u.full_name AS user_name
       FROM bookings b
       JOIN spaces s ON s.id = b.space_id
       JOIN users u ON u.id = b.user_id
       WHERE b.status = 'CONFIRMADA' AND b.booking_date = $1
       ORDER BY b.start_time`,
      [date],
    )
    const totalSpaces = await query('SELECT COUNT(*)::int AS n FROM spaces WHERE active = true')
    const occupiedSpaces = new Set(rows.map((r) => r.space_id)).size
    const total = totalSpaces.rows[0].n
    return res.json({
      date,
      totalSpaces: total,
      occupiedSpaces,
      freeSpaces: total - occupiedSpaces,
      occupancyRate: total ? Math.round((occupiedSpaces / total) * 100) : 0,
      bookings: rows,
    })
  } catch (err) {
    return next(err)
  }
}

/** GET /bookings/analytics — métricas para administradores */
async function analytics(req, res, next) {
  try {
    const totals = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status='CONFIRMADA')::int AS confirmadas,
         COUNT(*) FILTER (WHERE status='CANCELADA')::int AS canceladas,
         COUNT(*)::int AS total
       FROM bookings`,
    )
    const topSpaces = await query(
      `SELECT s.id, s.name, s.type, COUNT(b.id)::int AS reservas
       FROM spaces s LEFT JOIN bookings b ON b.space_id = s.id AND b.status='CONFIRMADA'
       GROUP BY s.id, s.name, s.type
       ORDER BY reservas DESC, s.name LIMIT 8`,
    )
    const peakHours = await query(
      `SELECT EXTRACT(HOUR FROM start_time)::int AS hora, COUNT(*)::int AS reservas
       FROM bookings WHERE status='CONFIRMADA'
       GROUP BY hora ORDER BY hora`,
    )
    const byType = await query(
      `SELECT s.type, COUNT(b.id)::int AS reservas
       FROM bookings b JOIN spaces s ON s.id=b.space_id
       WHERE b.status='CONFIRMADA' GROUP BY s.type`,
    )
    const byUser = await query(
      `SELECT u.id AS user_id, u.full_name, COUNT(b.id)::int AS reservas
       FROM bookings b JOIN users u ON u.id = b.user_id
       WHERE b.status='CONFIRMADA'
       GROUP BY u.id, u.full_name
       ORDER BY reservas DESC, u.full_name
       LIMIT 5`,
    )
    const cancelRate = totals.rows[0].total
      ? Math.round((totals.rows[0].canceladas / totals.rows[0].total) * 100)
      : 0
    return res.json({
      totals: totals.rows[0],
      cancelRate,
      topSpaces: topSpaces.rows,
      peakHours: peakHours.rows,
      byType: byType.rows,
      byUser: byUser.rows,
    })
  } catch (err) {
    return next(err)
  }
}

/**
 * GET /bookings/suggestions?date&duration&type&minCapacity
 * Sugiere franjas libres óptimas (08:00–20:00) priorizando espacios menos usados.
 * Base del "Asistente de sugerencias".
 */
async function suggestions(req, res, next) {
  try {
    const date = req.query.date || todayStr()
    const duration = Math.max(15, Number(req.query.duration) || 60)
    const { type, minCapacity } = req.query

    const { spaces, degraded } = await listSpacesResilient(
      { type, minCapacity },
      req.headers.authorization || '',
    )
    markDegraded(res, degraded)
    if (!spaces.length) return res.json({ date, duration, suggestions: [] })

    const ids = spaces.map((s) => s.id)
    const dayBookings = await query(
      `SELECT space_id, start_time, end_time FROM bookings
       WHERE status='CONFIRMADA' AND booking_date=$1 AND space_id = ANY($2::int[])`,
      [date, ids],
    )
    const usage = {}
    const bySpace = {}
    for (const id of ids) { bySpace[id] = []; usage[id] = 0 }
    for (const b of dayBookings.rows) {
      bySpace[b.space_id].push([timeToMinutes(b.start_time), timeToMinutes(b.end_time)])
      usage[b.space_id] += timeToMinutes(b.end_time) - timeToMinutes(b.start_time)
    }

    const DAY_START = 8 * 60
    const DAY_END = 20 * 60
    const STEP = 30
    const out = []
    // Priorizar espacios menos utilizados.
    const ordered = [...spaces].sort((a, b) => usage[a.id] - usage[b.id])
    for (const space of ordered) {
      const taken = bySpace[space.id]
      for (let t = DAY_START; t + duration <= DAY_END; t += STEP) {
        const s = t
        const e = t + duration
        const clash = taken.some(([bs, be]) => s < be && bs < e)
        if (!clash) {
          out.push({
            space_id: space.id,
            space_name: space.name,
            type: space.type,
            floor: space.floor,
            capacity: space.capacity,
            start: `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`,
            end: `${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`,
          })
          break // una sugerencia por espacio
        }
      }
      if (out.length >= 5) break
    }
    return res.json({ date, duration, suggestions: out })
  } catch (err) {
    return next(err)
  }
}

module.exports = {
  searchAvailability, createBooking, myBookings, cancelBooking, occupancy, analytics, suggestions,
}

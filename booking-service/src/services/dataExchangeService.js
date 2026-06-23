const { pool, query } = require('../config/db')
const { RE_DATE, RE_TIME, timeToMinutes } = require('../validators/bookingValidators')

const MAX_ROWS_PER_IMPORT = 2000
const MS_PER_DAY = 24 * 60 * 60 * 1000

function normalizeKey(key) {
  return String(key || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function rowReader(row) {
  const values = {}
  Object.entries(row || {}).forEach(([key, value]) => {
    values[normalizeKey(key)] = value
  })
  return (aliases) => {
    for (const alias of aliases) {
      const key = normalizeKey(alias)
      if (Object.prototype.hasOwnProperty.call(values, key)) return values[key]
    }
    return undefined
  }
}

function cleanText(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function nullableText(value) {
  const text = cleanText(value)
  return text ? text : null
}

function parseInteger(value) {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  return Number.isInteger(n) ? n : null
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'boolean') return value
  const text = cleanText(value).toLowerCase()
  if (['1', 'true', 'si', 's', 'yes', 'y', 'x', 'activo', 'active'].includes(text)) return true
  if (['0', 'false', 'no', 'n', 'inactivo', 'inactive'].includes(text)) return false
  return fallback
}

function normalizeSpaceType(value) {
  const text = cleanText(value).toUpperCase()
  if (text === 'SALA' || text.includes('SALA') || text.includes('ROOM')) return 'SALA'
  if (
    text === 'ESCRITORIO' ||
    text === 'DESK' ||
    text.includes('ESCRITORIO') ||
    text.includes('HOT_DESK')
  ) {
    return 'ESCRITORIO'
  }
  return ''
}

function normalizeStatus(value) {
  const text = cleanText(value).toUpperCase()
  if (text.includes('CANCEL')) return 'CANCELADA'
  return 'CONFIRMADA'
}

function excelSerialToDate(serial) {
  const date = new Date(Date.UTC(1899, 11, 30) + Number(serial) * MS_PER_DAY)
  return date.toISOString().slice(0, 10)
}

function normalizeDate(value) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'number' && Number.isFinite(value)) return excelSerialToDate(value)
  const text = cleanText(value)
  if (RE_DATE.test(text.slice(0, 10))) return text.slice(0, 10)

  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (dmy) {
    const day = Number(dmy[1])
    const month = Number(dmy[2])
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return ''
}

function normalizeTime(value) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'number' && Number.isFinite(value)) {
    const minutes = Math.round((value % 1) * 24 * 60)
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  }

  const text = cleanText(value)
  const direct = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i)
  if (direct) {
    let hour = Number(direct[1])
    const minute = Number(direct[2])
    const ampm = direct[3]?.toUpperCase()
    if (ampm === 'PM' && hour < 12) hour += 12
    if (ampm === 'AM' && hour === 12) hour = 0
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }
  }

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) {
    return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`
  }
  return ''
}

function validateBookingImport({ date, start, end, attendees, capacity }) {
  const errors = []
  if (!RE_DATE.test(date || '')) {
    errors.push({ code: 'FECHA_INVALIDA', message: 'Formato de fecha invalido (YYYY-MM-DD)' })
  }
  if (!RE_TIME.test(start || '')) {
    errors.push({ code: 'HORA_INICIO_INVALIDA', message: 'Hora de inicio invalida (HH:MM)' })
  }
  if (!RE_TIME.test(end || '')) {
    errors.push({ code: 'HORA_FIN_INVALIDA', message: 'Hora de fin invalida (HH:MM)' })
  }
  if (errors.length) return errors

  if (timeToMinutes(end) <= timeToMinutes(start)) {
    errors.push({ code: 'ORDEN_HORARIO', message: 'La hora de fin debe ser mayor que la de inicio' })
  }
  if (!Number.isInteger(attendees) || attendees < 1) {
    errors.push({ code: 'ASISTENTES_INVALIDOS', message: 'El numero de asistentes debe ser al menos 1' })
  } else if (capacity != null && attendees > capacity) {
    errors.push({
      code: 'CAPACIDAD_EXCEDIDA',
      message: `La capacidad del espacio es ${capacity}; no admite ${attendees} asistentes`,
    })
  }
  return errors
}

function normalizeSpaceRow(row) {
  const read = rowReader(row)
  const id = parseInteger(read(['id', 'space_id', 'espacio_id']))
  return {
    source_id: id,
    name: cleanText(read(['name', 'nombre', 'space_name', 'espacio'])),
    type: normalizeSpaceType(read(['type', 'tipo'])),
    capacity: parseInteger(read(['capacity', 'capacidad'])),
    floor: cleanText(read(['floor', 'piso'])),
    location: nullableText(read(['location', 'ubicacion', 'ubicación'])),
    has_projector: parseBoolean(read(['has_projector', 'projector', 'proyector', 'tiene_proyector'])),
    has_ac: parseBoolean(read(['has_ac', 'ac', 'aire_acondicionado', 'aire'])),
    has_videoconference: parseBoolean(
      read(['has_videoconference', 'videoconference', 'videoconferencia']),
    ),
    active: parseBoolean(read(['active', 'activo', 'estado']), true),
  }
}

function normalizeBookingRow(row) {
  const read = rowReader(row)
  return {
    source_id: parseInteger(read(['id', 'booking_id', 'reserva_id'])),
    space_id: parseInteger(read(['space_id', 'espacio_id'])),
    space_name: cleanText(read(['space_name', 'espacio', 'space', 'nombre_espacio'])),
    user_email: cleanText(read(['user_email', 'email', 'correo', 'organizer_email'])).toLowerCase(),
    title: cleanText(read(['title', 'titulo', 'título', 'motivo'])) || 'Reserva',
    booking_date: normalizeDate(read(['booking_date', 'date', 'fecha'])),
    start_time: normalizeTime(read(['start_time', 'start', 'inicio', 'hora_inicio'])),
    end_time: normalizeTime(read(['end_time', 'end', 'fin', 'hora_fin'])),
    attendees: parseInteger(read(['attendees', 'asistentes', 'personas'])),
    status: normalizeStatus(read(['status', 'estado'])),
  }
}

function emptySummary() {
  return {
    spaces: { created: 0, updated: 0, skipped: 0 },
    bookings: { created: 0, updated: 0, skipped: 0 },
    errors: [],
  }
}

function pushError(summary, section, rowNumber, message, details = null) {
  summary.errors.push({ section, row: rowNumber, message, details })
}

async function exportOfficeData() {
  const spaces = await query(
    `SELECT id, name, type, capacity, floor, location, has_projector, has_ac,
            has_videoconference, active
     FROM spaces
     ORDER BY type, capacity DESC, name`,
  )
  const bookings = await query(
    `SELECT b.id, b.space_id, s.name AS space_name, u.email AS user_email,
            u.full_name AS user_name, b.title,
            to_char(b.booking_date, 'YYYY-MM-DD') AS booking_date,
            to_char(b.start_time, 'HH24:MI') AS start_time,
            to_char(b.end_time, 'HH24:MI') AS end_time,
            b.attendees, b.status
     FROM bookings b
     JOIN spaces s ON s.id = b.space_id
     JOIN users u ON u.id = b.user_id
     ORDER BY b.booking_date DESC, b.start_time DESC, b.id DESC`,
  )
  return {
    exportedAt: new Date().toISOString(),
    spaces: spaces.rows,
    bookings: bookings.rows,
  }
}

async function resolveSpace(client, normalized, spaceIdMap) {
  if (normalized.space_id && spaceIdMap.has(normalized.space_id)) {
    const mappedId = spaceIdMap.get(normalized.space_id)
    const byMappedId = await client.query('SELECT * FROM spaces WHERE id = $1', [mappedId])
    if (byMappedId.rows[0]) return byMappedId.rows[0]
  }
  if (normalized.space_id) {
    const byId = await client.query('SELECT * FROM spaces WHERE id = $1', [normalized.space_id])
    if (byId.rows[0]) return byId.rows[0]
  }
  if (normalized.space_name) {
    const byName = await client.query('SELECT * FROM spaces WHERE lower(name) = lower($1) LIMIT 1', [
      normalized.space_name,
    ])
    if (byName.rows[0]) return byName.rows[0]
  }
  return null
}

async function resolveUser(client, email, fallbackUserId) {
  if (email) {
    const byEmail = await client.query('SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1', [
      email,
    ])
    if (byEmail.rows[0]) return byEmail.rows[0]
  }
  const fallback = await client.query('SELECT * FROM users WHERE id = $1', [fallbackUserId])
  return fallback.rows[0]
}

async function importSpaces(client, rows, summary) {
  const spaceIdMap = new Map()
  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2
    const space = normalizeSpaceRow(row)
    const missing = []
    if (!space.name) missing.push('name')
    if (!space.type) missing.push('type')
    if (!Number.isInteger(space.capacity) || space.capacity < 1) missing.push('capacity')
    if (!space.floor) missing.push('floor')

    if (missing.length) {
      summary.spaces.skipped += 1
      pushError(summary, 'spaces', rowNumber, `Campos invalidos: ${missing.join(', ')}`)
      continue
    }

    try {
      await client.query('SAVEPOINT import_space_row')
      const existingById = space.source_id
        ? await client.query('SELECT * FROM spaces WHERE id = $1', [space.source_id])
        : { rows: [] }
      const existing = existingById.rows[0]
        || (
          await client.query('SELECT * FROM spaces WHERE lower(name) = lower($1) LIMIT 1', [space.name])
        ).rows[0]

      if (existing) {
        const updated = await client.query(
          `UPDATE spaces
           SET name=$1, type=$2, capacity=$3, floor=$4, location=$5,
               has_projector=$6, has_ac=$7, has_videoconference=$8, active=$9
           WHERE id=$10
           RETURNING id`,
          [
            space.name,
            space.type,
            space.capacity,
            space.floor,
            space.location,
            space.has_projector,
            space.has_ac,
            space.has_videoconference,
            space.active,
            existing.id,
          ],
        )
        summary.spaces.updated += 1
        if (space.source_id) spaceIdMap.set(space.source_id, updated.rows[0].id)
      } else {
        const inserted = await client.query(
          `INSERT INTO spaces
             (name, type, capacity, floor, location, has_projector, has_ac, has_videoconference, active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           RETURNING id`,
          [
            space.name,
            space.type,
            space.capacity,
            space.floor,
            space.location,
            space.has_projector,
            space.has_ac,
            space.has_videoconference,
            space.active,
          ],
        )
        summary.spaces.created += 1
        if (space.source_id) spaceIdMap.set(space.source_id, inserted.rows[0].id)
      }
      await client.query('RELEASE SAVEPOINT import_space_row')
    } catch (err) {
      await client.query('ROLLBACK TO SAVEPOINT import_space_row')
      summary.spaces.skipped += 1
      pushError(summary, 'spaces', rowNumber, err.message)
    }
  }
  return spaceIdMap
}

async function importBookings(client, rows, summary, spaceIdMap, fallbackUserId) {
  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2
    const booking = normalizeBookingRow(row)
    const space = await resolveSpace(client, booking, spaceIdMap)
    if (!space) {
      summary.bookings.skipped += 1
      pushError(summary, 'bookings', rowNumber, 'Espacio no encontrado')
      continue
    }

    const user = await resolveUser(client, booking.user_email, fallbackUserId)
    if (!user) {
      summary.bookings.skipped += 1
      pushError(summary, 'bookings', rowNumber, 'Usuario no encontrado')
      continue
    }

    const validationErrors = validateBookingImport({
      date: booking.booking_date,
      start: booking.start_time,
      end: booking.end_time,
      attendees: booking.attendees,
      capacity: space.capacity,
    })
    if (validationErrors.length) {
      summary.bookings.skipped += 1
      pushError(summary, 'bookings', rowNumber, 'Reserva invalida', validationErrors)
      continue
    }

    try {
      await client.query('SAVEPOINT import_booking_row')
      const existingById = booking.source_id
        ? await client.query('SELECT * FROM bookings WHERE id = $1', [booking.source_id])
        : { rows: [] }
      const existing = existingById.rows[0]
        || (
          await client.query(
            `SELECT * FROM bookings
             WHERE space_id=$1 AND user_id=$2 AND booking_date=$3
               AND start_time=$4::time AND end_time=$5::time
             LIMIT 1`,
            [space.id, user.id, booking.booking_date, booking.start_time, booking.end_time],
          )
        ).rows[0]

      if (booking.status === 'CONFIRMADA') {
        const overlap = await client.query(
          `SELECT id, start_time, end_time FROM bookings
           WHERE space_id = $1 AND status = 'CONFIRMADA' AND booking_date = $2
             AND start_time < $4::time AND end_time > $3::time
             AND ($5::int IS NULL OR id <> $5::int)
           LIMIT 1`,
          [space.id, booking.booking_date, booking.start_time, booking.end_time, existing?.id || null],
        )
        if (overlap.rows[0]) {
          await client.query('ROLLBACK TO SAVEPOINT import_booking_row')
          summary.bookings.skipped += 1
          pushError(summary, 'bookings', rowNumber, 'La reserva se solapa con una reserva existente')
          continue
        }
      }

      if (existing) {
        await client.query(
          `UPDATE bookings
           SET space_id=$1, user_id=$2, title=$3, booking_date=$4,
               start_time=$5, end_time=$6, attendees=$7, status=$8
           WHERE id=$9`,
          [
            space.id,
            user.id,
            booking.title,
            booking.booking_date,
            booking.start_time,
            booking.end_time,
            booking.attendees,
            booking.status,
            existing.id,
          ],
        )
        summary.bookings.updated += 1
      } else {
        await client.query(
          `INSERT INTO bookings
             (space_id, user_id, title, booking_date, start_time, end_time, attendees, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            space.id,
            user.id,
            booking.title,
            booking.booking_date,
            booking.start_time,
            booking.end_time,
            booking.attendees,
            booking.status,
          ],
        )
        summary.bookings.created += 1
      }
      await client.query('RELEASE SAVEPOINT import_booking_row')
    } catch (err) {
      await client.query('ROLLBACK TO SAVEPOINT import_booking_row')
      summary.bookings.skipped += 1
      const message = err.code === '23P01'
        ? 'La reserva se solapa con una reserva existente'
        : err.message
      pushError(summary, 'bookings', rowNumber, message)
    }
  }
}

async function importOfficeData({ spaces = [], bookings = [], fallbackUserId }) {
  const totalRows = spaces.length + bookings.length
  if (totalRows > MAX_ROWS_PER_IMPORT) {
    const err = new Error(`El archivo supera el limite de ${MAX_ROWS_PER_IMPORT} filas`)
    err.statusCode = 413
    throw err
  }

  const summary = emptySummary()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const spaceIdMap = await importSpaces(client, spaces, summary)
    await importBookings(client, bookings, summary, spaceIdMap, fallbackUserId)
    await client.query('COMMIT')
    return summary
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { exportOfficeData, importOfficeData }

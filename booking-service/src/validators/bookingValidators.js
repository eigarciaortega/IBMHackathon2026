/**
 * Validadores PUROS del motor de reservas (sin dependencias de BD).
 * Diseñados para ser fácilmente probados con tests unitarios.
 *
 * Reglas de negocio (Brief IBM OfficeSpace):
 *  1. Capacidad: asistentes <= capacidad del espacio.
 *  2. No solapamiento: dos reservas del mismo espacio no pueden encimarse.
 *  3. Consistencia temporal: fin > inicio.
 *  4. Fecha: no se permiten reservas en el pasado.
 *
 * Semántica de intervalos: [inicio, fin)  (inicio inclusivo, fin exclusivo)
 *  -> 10:00–11:00 y 11:00–12:00 NO se solapan (reservas consecutivas válidas).
 */

const RE_TIME = /^\d{2}:\d{2}(:\d{2})?$/
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/
const APP_TIME_ZONE = process.env.APP_TIME_ZONE || 'America/Mexico_City'

function timeToMinutes(t) {
  const [h, m] = String(t).split(':').map(Number)
  return h * 60 + m
}

/**
 * ¿Se solapan los intervalos [aStart,aEnd) y [bStart,bEnd)? (minutos)
 */
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

/**
 * ¿La fecha+hora de inicio está en el pasado respecto a `now`?
 */
function nowStampInTimeZone(now, timeZone = APP_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
}

function normalizeTimeStamp(t) {
  const [h, m, s = '00'] = String(t).split(':')
  return `${h}:${m}:${s}`
}

function isPastDateTime(dateStr, startStr, now = new Date()) {
  return `${dateStr}T${normalizeTimeStamp(startStr)}` < nowStampInTimeZone(now)
}

/**
 * Valida una solicitud de reserva contra las reglas de negocio.
 * @returns {{ valid: boolean, errors: Array<{code:string,message:string}> }}
 */
function validateBooking({ date, start, end, attendees, capacity, now = new Date() }) {
  const errors = []

  if (!RE_DATE.test(date || '')) {
    errors.push({ code: 'FECHA_INVALIDA', message: 'Formato de fecha inválido (se espera YYYY-MM-DD)' })
  }
  if (!RE_TIME.test(start || '')) {
    errors.push({ code: 'HORA_INICIO_INVALIDA', message: 'Hora de inicio inválida (HH:MM)' })
  }
  if (!RE_TIME.test(end || '')) {
    errors.push({ code: 'HORA_FIN_INVALIDA', message: 'Hora de fin inválida (HH:MM)' })
  }
  if (errors.length) return { valid: false, errors }

  const s = timeToMinutes(start)
  const e = timeToMinutes(end)

  // Regla 3: consistencia temporal
  if (e <= s) {
    errors.push({ code: 'ORDEN_HORARIO', message: 'La hora de fin debe ser mayor que la de inicio' })
  }
  // Regla 1: asistentes y capacidad
  const att = Number(attendees)
  if (!Number.isInteger(att) || att < 1) {
    errors.push({ code: 'ASISTENTES_INVALIDOS', message: 'El número de asistentes debe ser al menos 1' })
  } else if (capacity != null && att > capacity) {
    errors.push({
      code: 'CAPACIDAD_EXCEDIDA',
      message: `La capacidad del espacio es ${capacity}; no admite ${att} asistentes`,
    })
  }
  // Regla 4: no en el pasado
  if (isPastDateTime(date, start, now)) {
    errors.push({ code: 'FECHA_PASADA', message: 'No se pueden crear reservas en el pasado' })
  }

  return { valid: errors.length === 0, errors }
}

module.exports = { timeToMinutes, rangesOverlap, isPastDateTime, validateBooking, RE_TIME, RE_DATE }

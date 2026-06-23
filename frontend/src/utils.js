/**
 * Utilidades compartidas de formato y fechas.
 */

/** "09:00:00" -> "09:00" */
export function fmtTime(t) {
  if (!t) return ''
  return String(t).slice(0, 5)
}

/** Devuelve la fecha de hoy en formato YYYY-MM-DD (zona local). */
export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function bookingDateTime(dateStr, timeStr) {
  const iso = String(dateStr).slice(0, 10)
  return new Date(`${iso}T${fmtTime(timeStr)}:00`)
}

function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

/** Formatea YYYY-MM-DD a una fecha legible según el idioma. */
export function fmtDate(dateStr, lang = 'es') {
  if (!dateStr) return ''
  const iso = String(dateStr).slice(0, 10)
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const locales = { es: 'es-ES', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE' }
  try {
    return date.toLocaleDateString(locales[lang] || 'es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

/** Construye enlaces de recordatorio para WhatsApp y calendarios. */
export function buildReminderLinks({ title, date, start, end, location = '', details = '' }) {
  const startDate = bookingDateTime(date, start)
  const endDate = bookingDateTime(date, end)
  const bookingTitle = title || 'Reserva'
  const textParts = [
    'Recordatorio de reserva',
    bookingTitle,
    `Fecha: ${String(date).slice(0, 10)}`,
    `Horario: ${fmtTime(start)} - ${fmtTime(end)}`,
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

/** ¿La reserva (fecha + hora inicio) ya pasó? */
export function isPast(dateStr, startTime) {
  const iso = String(dateStr).slice(0, 10)
  const dt = new Date(`${iso}T${fmtTime(startTime)}:00`)
  return dt.getTime() < Date.now()
}

/** Lista de recursos activos de un espacio, traducidos. */
export function resourceChips(space, t) {
  const chips = []
  if (space.has_projector) chips.push(t('resources.projector'))
  if (space.has_ac) chips.push(t('resources.ac'))
  if (space.has_videoconference) chips.push(t('resources.videoconference'))
  return chips
}

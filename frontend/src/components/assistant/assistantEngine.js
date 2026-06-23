/**
 * "Cerebro" local del asistente. Interpreta la intención mediante palabras
 * clave multilingües y responde consultando los datos reales del backend.
 * No usa servicios de IA externos: la inferencia es ligera y on-device.
 */
import {
  fetchAnalytics,
  fetchOccupancy,
  fetchSuggestions,
  listSpaces,
  myBookings,
  searchAvailability,
} from '../../api'
import { fmtDate, fmtTime, isPast } from '../../utils'

const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const KW = {
  occupancy: [
    'ocupa',
    'ocupad',
    'occupied',
    'occupanc',
    'belegt',
    'belegung',
    'occup',
    'ocupacao',
    'occupation',
  ],
  availability: [
    'disponib',
    'available',
    'frei',
    'livre',
    'libre',
    'free',
    'buscar',
    'search',
    'find',
    'encontr',
    'trouver',
    'finden',
  ],
  bookings: [
    'reserva',
    'booking',
    'buchung',
    'reservation',
    'réservation',
    'mis reservas',
    'minhas',
    'meine',
    'mes reservations',
    'tengo',
    'tenho',
    'how many',
    'cuantas',
    'combien',
    'wie viele',
  ],
  suggestion: [
    'sugier',
    'suggest',
    'sugest',
    'schlag',
    'suggere',
    'recomien',
    'recommend',
    'franja',
    'slot',
    'creneau',
    'vorschlag',
    'hora libre',
  ],
  help: [
    'ayuda',
    'help',
    'hola',
    'hello',
    'bonjour',
    'ola',
    'hallo',
    'aide',
    'hilfe',
    'que puedes',
    'what can you',
  ],
  spaces: [
    'espacio',
    'sala',
    'escritorio',
    'catalogo',
    'inventario',
    'recurso',
    'space',
    'room',
    'desk',
    'catalog',
    'inventory',
    'resource',
    'salle',
    'bureau',
    'raum',
    'schreibtisch',
  ],
  analytics: [
    'analit',
    'metric',
    'metrica',
    'analytics',
    'analyse',
    'analise',
    'top',
    'pico',
    'peak',
    'cancelacion',
    'cancelamento',
    'annulation',
    'storno',
  ],
  api: [
    'api',
    'swagger',
    'openapi',
    'endpoint',
    'microservicio',
    'service',
    'servicio',
    'contrato',
  ],
  room: ['sala', 'room', 'salle', 'raum', 'reunion', 'meeting', 'juntas'],
  desk: ['escritorio', 'desk', 'bureau', 'schreibtisch', 'hot desk'],
}

function matches(text, arr) {
  return arr.some((k) => text.includes(norm(k)))
}

function todayStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function toClock(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(
    2,
    '0',
  )}`
}

function nextAvailabilityWindow() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const start = 8 * 60

  return { date: todayStr(date), start: toClock(start), end: toClock(start + 60) }
}

function detectType(text) {
  if (matches(text, KW.desk)) return 'ESCRITORIO'
  if (matches(text, KW.room)) return 'SALA'
  return undefined
}

function detectCapacity(text) {
  const match = text.match(
    /\b(\d{1,2})\s*(persona|personas|people|participant|asistent|teilnehmer)/,
  )
  return match ? Number(match[1]) : undefined
}

function detectSpaceFilters(text) {
  return {
    type: detectType(text),
    minCapacity: detectCapacity(text),
    projector:
      text.includes('proyector') || text.includes('projector') || text.includes('projecteur'),
    ac:
      text.includes('aire') ||
      text.includes('air conditioning') ||
      text.includes('climatisation') ||
      text.includes('klimaanlage'),
    videoconference:
      text.includes('videoconferencia') ||
      text.includes('videoconference') ||
      text.includes('visioconference') ||
      text.includes('videokonferenz'),
  }
}

export async function handleQuery(raw, { t, lang, isAdmin = false }) {
  const text = ` ${norm(raw)} `
  try {
    if (matches(text, KW.occupancy)) {
      const o = await fetchOccupancy()
      return t('assistant.answers.occupancy', {
        occupied: o.occupiedSpaces,
        total: o.totalSpaces,
        free: o.freeSpaces,
        rate: o.occupancyRate,
      })
    }

    if (matches(text, KW.availability)) {
      const window = nextAvailabilityWindow()
      const filters = detectSpaceFilters(text)
      const available = await searchAvailability({
        date: window.date,
        start: window.start,
        end: window.end,
        type: filters.type,
        minCapacity: filters.minCapacity,
      })

      if (!available.length) {
        return t('assistant.answers.availabilityNone', {
          date: fmtDate(window.date, lang),
          start: window.start,
          end: window.end,
        })
      }

      return t('assistant.answers.availability', {
        count: available.length,
        date: fmtDate(window.date, lang),
        start: window.start,
        end: window.end,
        spaces: available
          .slice(0, 3)
          .map((s) => s.name)
          .join(', '),
      })
    }

    if (matches(text, KW.bookings) && !matches(text, KW.spaces)) {
      const list = await myBookings()
      const upcoming = list
        .filter((b) => b.status === 'CONFIRMADA' && !isPast(b.booking_date, b.start_time))
        .sort((a, b) =>
          `${a.booking_date}${a.start_time}`.localeCompare(`${b.booking_date}${b.start_time}`),
        )
      if (upcoming.length === 0) return t('assistant.answers.myBookingsNone')
      const n = upcoming[0]
      const next = t('assistant.answers.next', {
        date: fmtDate(n.booking_date, lang),
        start: fmtTime(n.start_time),
      })
      return t('assistant.answers.myBookingsCount', { count: upcoming.length, next })
    }

    if (matches(text, KW.suggestion)) {
      const filters = detectSpaceFilters(text)
      const r = await fetchSuggestions({
        duration: 60,
        type: filters.type,
        minCapacity: filters.minCapacity,
      })
      if (!r.suggestions || r.suggestions.length === 0) return t('assistant.answers.suggestionNone')
      const s = r.suggestions[0]
      return t('assistant.answers.suggestion', {
        space: s.space_name,
        floor: s.floor,
        start: s.start,
        end: s.end,
      })
    }

    if (matches(text, KW.analytics)) {
      if (!isAdmin) return t('assistant.answers.analyticsForbidden')
      const data = await fetchAnalytics()
      if (!data?.totals?.total) return t('assistant.answers.analyticsNone')
      const topSpace = data.topSpaces?.find((s) => s.reservas > 0) || data.topSpaces?.[0]
      const peak = [...(data.peakHours || [])].sort((a, b) => b.reservas - a.reservas)[0]
      return t('assistant.answers.analytics', {
        total: data.totals.total,
        confirmed: data.totals.confirmadas,
        cancelRate: data.cancelRate,
        top: topSpace ? `${topSpace.name} (${topSpace.reservas})` : t('common.none'),
        peak: peak ? `${String(peak.hora).padStart(2, '0')}:00` : t('common.none'),
      })
    }

    if (matches(text, KW.spaces)) {
      const filters = detectSpaceFilters(text)
      const spaces = await listSpaces({
        type: filters.type,
        minCapacity: filters.minCapacity,
        projector: filters.projector || undefined,
        ac: filters.ac || undefined,
        videoconference: filters.videoconference || undefined,
      })
      if (!spaces.length) return t('assistant.answers.spacesNone')
      const rooms = spaces.filter((s) => s.type === 'SALA').length
      const desks = spaces.filter((s) => s.type === 'ESCRITORIO').length
      const strongest = [...spaces].sort((a, b) => b.capacity - a.capacity)[0]
      return t('assistant.answers.spaces', {
        total: spaces.length,
        rooms,
        desks,
        top: strongest ? `${strongest.name} (${strongest.capacity})` : t('common.none'),
      })
    }

    if (matches(text, KW.api)) return t('assistant.answers.apiGuide')
    if (matches(text, KW.help)) return t('assistant.answers.help')
    return t('assistant.answers.unknown')
  } catch (e) {
    return t('assistant.answers.error')
  }
}

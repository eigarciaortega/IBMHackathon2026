// Utilidades de fecha/hora. Todo el frontend trabaja con strings "YYYY-MM-DD" y
// "HH:MM" para mantener coherencia con la API.

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function hoyISO(): string {
  return ymd(new Date())
}

export function fechaLegible(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const fecha = new Date(y, m - 1, d)
  return fecha.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// Opciones de hora en punto y media hora, de inicio a fin (incluyente).
export function opcionesHora(desde = 7, hasta = 21): string[] {
  const horas: string[] = []
  for (let h = desde; h <= hasta; h++) {
    horas.push(`${pad(h)}:00`)
    if (h !== hasta) horas.push(`${pad(h)}:30`)
  }
  return horas
}

// Convierte "HH:MM" a minutos desde medianoche (para cálculos de la pista).
export function horaAMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

// Tiempo relativo legible en español ("hace 2 min", "hace 3 h", "ayer"...).
export function tiempoRelativo(iso: string): string {
  const fecha = new Date(iso)
  const seg = Math.round((Date.now() - fecha.getTime()) / 1000)
  if (Number.isNaN(seg)) return ''
  if (seg < 45) return 'hace un momento'
  const min = Math.round(seg / 60)
  if (min < 60) return `hace ${min} min`
  const horas = Math.round(min / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.round(horas / 24)
  if (dias === 1) return 'ayer'
  if (dias < 7) return `hace ${dias} días`
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

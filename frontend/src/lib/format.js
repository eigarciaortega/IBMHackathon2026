/** Utilidades de formato (banca). */

/** "$1,000.00" */
export function money(value) {
  const n = Number(value) || 0
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Fecha + hora legible (es-MX). */
export function dateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Solo fecha corta. */
export function dateShort(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

/** Solo dígitos de un teléfono. */
export function digits(phone) {
  return String(phone || '').replace(/\D/g, '')
}

/** Número de cuenta enmascarado, determinístico a partir del id: "···· 4291". */
export function maskAccount(user) {
  const id = Number(user?.id) || 0
  const last4 = String(4291 + (id - 1) * 909).slice(-4)
  return '···· ' + last4
}

/** Iniciales para el avatar. */
export function initials(name = '') {
  const parts = String(name).replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean)
  return (parts.slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase()
}

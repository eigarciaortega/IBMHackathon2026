/**
 * Utilidades de dinero (RN-005 · Precisión decimal de 2 dígitos).
 * Funciones PURAS para redondear, validar y formatear montos.
 */

/** Redondea a 2 decimales de forma segura (evita errores binarios de float). */
function roundMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return NaN
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** ¿Monto válido? Numérico, finito, > 0 y con como máximo 2 decimales. */
function isValidAmount(value) {
  if (value === null || value === undefined || value === '') return false
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return false
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-9
}

/** Formatea como string con exactamente 2 decimales. */
function formatMoney(value) {
  const n = roundMoney(value)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

module.exports = { roundMoney, isValidAmount, formatMoney }

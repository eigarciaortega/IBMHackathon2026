/**
 * Utilidades de dinero (RN-005 · Precisión decimal de 2 dígitos).
 *
 * PostgreSQL devuelve los DECIMAL como string para no perder precisión;
 * aquí centralizamos la conversión, el redondeo a centavos y la validación
 * de montos. Funciones PURAS -> fáciles de testear sin BD.
 */

/** Redondea a 2 decimales de forma segura (evita errores binarios de float). */
function roundMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return NaN
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * ¿Es un monto válido para una operación de usuario?
 * Debe ser numérico, finito, MAYOR a cero y con como máximo 2 decimales.
 */
function isValidAmount(value) {
  if (value === null || value === undefined || value === '') return false
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return false
  // Como máximo 2 decimales: n*100 debe ser (prácticamente) entero.
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-9
}

/** Formatea como string con exactamente 2 decimales: 900 -> "900.00". */
function formatMoney(value) {
  const n = roundMoney(value)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

module.exports = { roundMoney, isValidAmount, formatMoney }

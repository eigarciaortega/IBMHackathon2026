/**
 * Cliente HTTP hacia notification-service.
 *
 * Las notificaciones son "fire-and-forget": si el servicio de avisos está
 * caído o tarda, la operación monetaria NO debe fallar ni revertirse. Por
 * eso cualquier error se captura y se registra, pero no se propaga.
 */
const logger = require('../config/logger')

const BASE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002'
const TIMEOUT_MS = Number(process.env.NOTIFICATION_TIMEOUT_MS) || 2500
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'neowallet-internal-key-change-me'

/**
 * Envía una notificación (no bloquea el flujo principal ante fallos).
 * @returns {Promise<object|null>} respuesta del servicio o null si falló.
 */
async function notify(payload) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE_URL}/api/notify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-key': INTERNAL_API_KEY },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      logger.warn('notificacion rechazada', { status: res.status, template: payload.template })
      return null
    }
    return data
  } catch (err) {
    logger.warn('notificacion no enviada', { error: err.message, template: payload.template })
    return null
  } finally {
    clearTimeout(timer)
  }
}

module.exports = { notify }

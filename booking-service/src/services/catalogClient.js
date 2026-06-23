/**
 * Cliente HTTP hacia el catalog-service.
 * Demuestra la comunicación inter-servicios vía REST (no acceso a funciones).
 * Node 20+ incluye fetch global.
 */
const CATALOG_URL = (process.env.CATALOG_SERVICE_URL || 'http://localhost:4002').replace(/\/+$/, '')
const CATALOG_TIMEOUT_MS = Number(process.env.CATALOG_TIMEOUT_MS) || 1500

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CATALOG_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err) {
    err.status = err.name === 'AbortError' ? 504 : 503
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

async function listSpaces({ type, minCapacity } = {}, authHeader = '') {
  const qs = new URLSearchParams()
  if (type) qs.set('type', type)
  if (minCapacity) qs.set('minCapacity', String(minCapacity))
  const url = `${CATALOG_URL}/spaces${qs.toString() ? `?${qs}` : ''}`
  const resp = await fetchWithTimeout(url, { headers: { Authorization: authHeader } })
  if (!resp.ok) {
    const err = new Error(`catalog-service respondió ${resp.status}`)
    err.status = resp.status
    throw err
  }
  try {
    return await resp.json()
  } catch (err) {
    err.status = 502
    throw err
  }
}

module.exports = { listSpaces, CATALOG_URL, CATALOG_TIMEOUT_MS }

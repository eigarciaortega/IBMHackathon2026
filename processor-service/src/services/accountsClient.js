/**
 * Cliente HTTP hacia accounts-service. El processor NUNCA toca saldos por
 * SQL: delega cada débito/crédito en este servicio (separación de
 * responsabilidades y consistencia vía HTTP).
 *
 * Cada respuesta se normaliza a { ok, status, data, networkError } para que
 * la Saga decida la transición correcta incluso ante caídas de red.
 */
const BASE_URL = process.env.ACCOUNTS_SERVICE_URL || 'http://localhost:8000'
const TIMEOUT_MS = Number(process.env.ACCOUNTS_TIMEOUT_MS) || 3000
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'neowallet-internal-key-change-me'

async function request(method, path, body) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    // Todas las llamadas a accounts son internas (máquina-a-máquina).
    const headers = { 'x-internal-key': INTERNAL_API_KEY }
    if (body) headers['content-type'] = 'application/json'
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    const data = await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, data, networkError: false }
  } catch (err) {
    // Timeout o conexión rechazada: la Saga lo trata como fallo recuperable.
    return { ok: false, status: 0, data: null, networkError: true, error: err.message }
  } finally {
    clearTimeout(timer)
  }
}

/** Consulta un usuario (saldo incluido). 404 -> ok:false, status:404. */
function getUser(userId) {
  return request('GET', `/accounts/${userId}`)
}

/** Aplica un movimiento de saldo (operation: 'debit' | 'credit'). */
function updateBalance(userId, amount, operation, reference) {
  return request('POST', '/accounts/update-balance', {
    user_id: userId,
    amount,
    operation,
    reference,
  })
}

/** Consulta los asientos del libro mayor por referencia (para reconciliar). */
function getLedgerByReference(reference) {
  return request('GET', `/accounts/ledger/by-reference?reference=${encodeURIComponent(reference)}`)
}

/** Libro mayor completo de un usuario (para incluir recargas en el historial). */
function getLedger(userId) {
  return request('GET', `/accounts/${userId}/ledger`)
}

module.exports = { getUser, updateBalance, getLedgerByReference, getLedger }

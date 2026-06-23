/**
 * Cliente HTTP del frontend. Adjunta el JWT (Authorization: Bearer) a cada
 * llamada protegida. Las URLs se leen de variables VITE_* (puertos del host).
 */
const ACCOUNTS = import.meta.env.VITE_ACCOUNTS_URL || 'http://localhost:8000'
const PROCESSOR = import.meta.env.VITE_PROCESSOR_URL || 'http://localhost:3001'
const NOTIF = import.meta.env.VITE_NOTIFICATIONS_URL || 'http://localhost:3002'

export const ENDPOINTS = { ACCOUNTS, PROCESSOR, NOTIF }

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

// El token vive en memoria; AuthContext lo sincroniza con localStorage.
let authToken = null
let onUnauthorized = null
export function setToken(t) { authToken = t }
export function setUnauthorizedHandler(fn) { onUnauthorized = fn }

async function request(url, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (options.body) headers['content-type'] = 'application/json'
  if (authToken) headers.authorization = `Bearer ${authToken}`

  let res
  try {
    res = await fetch(url, { ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined })
  } catch (err) {
    throw new ApiError('No se pudo conectar con el servicio', 0, { network: true })
  }
  const data = await res.json().catch(() => null)
  if (res.status === 401 && onUnauthorized) onUnauthorized()
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Error ${res.status}`
    throw new ApiError(msg, res.status, data)
  }
  return data
}

// --- Auth -------------------------------------------------------------
export const login = (email, password) => request(`${ACCOUNTS}/auth/login`, { method: 'POST', body: { email, password } })
export const register = (body) => request(`${ACCOUNTS}/auth/register`, { method: 'POST', body })
export const me = () => request(`${ACCOUNTS}/auth/me`)

// --- Cuenta del usuario ----------------------------------------------
export const getDirectory = () => request(`${ACCOUNTS}/accounts/directory`)
export const recharge = (body) => request(`${ACCOUNTS}/api/recharge`, { method: 'POST', body })

// --- Transferencias / historial --------------------------------------
export const transfer = (body, idempotencyKey) =>
  request(`${PROCESSOR}/api/transfer`, {
    method: 'POST', body,
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
  })
export const getHistory = () => request(`${PROCESSOR}/api/transactions/me`)
export const emailStatement = () => request(`${PROCESSOR}/api/transactions/me/statement`, { method: 'POST' })

// --- Notificaciones ---------------------------------------------------
export const getMyNotifications = () => request(`${NOTIF}/api/notifications/mine`)

// --- Health (público) -------------------------------------------------
export async function getHealth() {
  const safe = async (url, name) => {
    try {
      const r = await fetch(`${url}/health`)
      const d = await r.json()
      return { name, ...d, reachable: true }
    } catch {
      return { name, status: 'down', reachable: false }
    }
  }
  return Promise.all([safe(ACCOUNTS, 'accounts'), safe(PROCESSOR, 'processor'), safe(NOTIF, 'notification')])
}

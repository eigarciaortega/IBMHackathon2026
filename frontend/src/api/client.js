/**
 * Cliente HTTP central de IBM OfficeSpace.
 * Las URLs de los microservicios se leen de variables Vite con valores
 * por defecto a localhost (el navegador accede a los puertos publicados).
 */
const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:4001'
const CATALOG_URL = import.meta.env.VITE_CATALOG_URL || 'http://localhost:4002'
const BOOKING_URL = import.meta.env.VITE_BOOKING_URL || 'http://localhost:4003'
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS) || 8000

const TOKEN_KEY = 'officespace_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function request(base, path, { method = 'GET', body, auth = true, params } = {}) {
  const url = new URL(base + path)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let resp
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    resp = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (e) {
    const message = e.name === 'AbortError'
      ? 'El servidor tardó demasiado en responder'
      : 'No se pudo conectar con el servidor'
    throw new ApiError(message, 0)
  } finally {
    clearTimeout(timeout)
  }

  const text = await resp.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch (e) {
    data = { raw: text }
  }
  if (!resp.ok) {
    throw new ApiError(data?.error || 'Error en la solicitud', resp.status, data)
  }
  return data
}

export const api = {
  auth: (path, opts) => request(AUTH_URL, path, opts),
  catalog: (path, opts) => request(CATALOG_URL, path, opts),
  booking: (path, opts) => request(BOOKING_URL, path, opts),
}

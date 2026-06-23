// Capa de acceso HTTP a los tres microservicios. Adjunta el JWT, parsea el sobre
// de error estándar y notifica el cierre de sesión cuando el token expira (401).

export const URLS = {
  auth: import.meta.env.VITE_AUTH_URL ?? 'http://localhost:8081',
  catalog: import.meta.env.VITE_CATALOG_URL ?? 'http://localhost:8082',
  booking: import.meta.env.VITE_BOOKING_URL ?? 'http://localhost:8083',
}

// ApiError lleva el código estable y el mensaje legible del sobre de error.
export class ApiError extends Error {
  codigo: string
  status: number
  constructor(status: number, codigo: string, mensaje: string) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.codigo = codigo
  }
}

let tokenActual: string | null = null
let alExpirar: (() => void) | null = null

export function fijarToken(token: string | null) {
  tokenActual = token
}

export function fijarManejadorDeExpiracion(fn: () => void) {
  alExpirar = fn
}

interface OpcionesPeticion {
  method?: string
  body?: unknown
  // Si es true, no se adjunta el token (p. ej. login).
  publico?: boolean
}

export async function peticion<T>(base: string, ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (opciones.body !== undefined) headers['Content-Type'] = 'application/json'
  if (!opciones.publico && tokenActual) headers['Authorization'] = `Bearer ${tokenActual}`

  let resp: Response
  try {
    resp = await fetch(base + ruta, {
      method: opciones.method ?? 'GET',
      headers,
      body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.')
  }

  if (resp.status === 401 && !opciones.publico) {
    alExpirar?.()
  }

  if (resp.status === 204) {
    return undefined as T
  }

  let datos: unknown = null
  const texto = await resp.text()
  if (texto) {
    try {
      datos = JSON.parse(texto)
    } catch {
      datos = null
    }
  }

  if (!resp.ok) {
    const sobre = datos as { error?: { codigo?: string; mensaje?: string } } | null
    throw new ApiError(
      resp.status,
      sobre?.error?.codigo ?? 'ERROR_DESCONOCIDO',
      sobre?.error?.mensaje ?? 'Ocurrió un error inesperado.',
    )
  }

  return datos as T
}

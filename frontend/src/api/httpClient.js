// Cliente HTTP centralizado.
//
// Responsabilidades (R2.1, R8.x, R12, contrato de error del diseño):
//   1. Adjuntar `Authorization: Bearer <token>` desde la sesión almacenada.
//   2. Interceptar respuestas 401 (sesión ausente/expirada) → limpiar sesión y
//      redirigir a /login.
//   3. Normalizar el contrato de error uniforme `{ error: { code, message, fields } }`
//      a una instancia de `ApiError` consumible por el módulo de feedback.

import { getToken, clearSession } from '../auth/session';

/**
 * Error normalizado del cliente. Espeja el contrato de error del backend
 * (`shared/errors.js`) para que las pantallas y el módulo de feedback puedan
 * mostrar `message` y resaltar los `fields` afectados.
 */
export class ApiError extends Error {
  /**
   * @param {Object} params
   * @param {string} params.code - Código de dominio (p. ej. "VALIDATION_ERROR").
   * @param {string} params.message - Mensaje legible.
   * @param {string[]} [params.fields] - Campos afectados.
   * @param {number} params.status - Código HTTP (0 para errores de red).
   */
  constructor({ code, message, fields, status }) {
    super(message || 'Error inesperado');
    this.name = 'ApiError';
    this.code = code || 'INTERNAL_ERROR';
    this.fields = Array.isArray(fields) ? fields : [];
    this.status = typeof status === 'number' ? status : 500;
  }
}

// Mensajes de respaldo cuando la respuesta de error no sigue el contrato uniforme.
const FALLBACK_BY_STATUS = {
  0: { code: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor' },
  400: { code: 'VALIDATION_ERROR', message: 'Solicitud inválida' },
  401: { code: 'AUTHENTICATION_ERROR', message: 'Se requiere autenticación' },
  403: { code: 'AUTHORIZATION_ERROR', message: 'Permisos insuficientes' },
  404: { code: 'NOT_FOUND', message: 'Recurso no encontrado' },
  409: { code: 'OVERLAP_CONFLICT', message: 'Conflicto con un recurso existente' },
  429: { code: 'TOO_MANY_ATTEMPTS', message: 'Demasiados intentos, intente más tarde' },
  500: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
};

/**
 * Handler invocado cuando se intercepta un 401. Por defecto limpia la sesión y
 * redirige a /login. Es inyectable para pruebas y para integrarlo con el router.
 * @type {() => void}
 */
let unauthorizedHandler = () => {
  clearSession();
  if (typeof window !== 'undefined' && window.location) {
    window.location.assign('/login');
  }
};

/**
 * Registra el handler de sesión no autorizada (401).
 * @param {() => void} fn
 */
export function setUnauthorizedHandler(fn) {
  if (typeof fn === 'function') {
    unauthorizedHandler = fn;
  }
}

/**
 * Normaliza la respuesta de error al contrato uniforme.
 * @param {number} status
 * @param {any} body
 * @returns {ApiError}
 */
export function normalizeError(status, body) {
  if (body && typeof body === 'object' && body.error && typeof body.error === 'object') {
    return new ApiError({
      code: body.error.code,
      message: body.error.message,
      fields: body.error.fields,
      status,
    });
  }
  const fallback = FALLBACK_BY_STATUS[status] || FALLBACK_BY_STATUS[500];
  return new ApiError({ code: fallback.code, message: fallback.message, status });
}

/**
 * Lee el cuerpo de la respuesta como JSON sin lanzar si está vacío o no es JSON.
 * @param {Response} response
 * @returns {Promise<any>}
 */
async function safeJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Realiza una solicitud HTTP contra un servicio backend.
 *
 * @param {string} baseUrl - URL base del servicio (ver `config.js`).
 * @param {string} path - Ruta del endpoint (p. ej. "/auth/login").
 * @param {Object} [options]
 * @param {string} [options.method] - Método HTTP (por defecto GET).
 * @param {any} [options.body] - Cuerpo a serializar como JSON.
 * @param {Object} [options.headers] - Cabeceras adicionales.
 * @param {AbortSignal} [options.signal] - Señal de cancelación.
 * @returns {Promise<any>} El cuerpo de respuesta parseado (o null en 204).
 * @throws {ApiError} Ante error de red o respuesta no exitosa.
 */
export async function request(baseUrl, path, options = {}) {
  const { method = 'GET', body, headers = {}, signal } = options;

  const finalHeaders = { Accept: 'application/json', ...headers };
  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    // Fallo de red (servidor caído, CORS, sin conexión).
    throw normalizeError(0, null);
  }

  // Intercepción de 401: limpiar sesión y redirigir a login (R2.1).
  if (response.status === 401) {
    unauthorizedHandler();
    const errorBody = await safeJson(response);
    throw normalizeError(401, errorBody);
  }

  if (response.status === 204) {
    return null;
  }

  const data = await safeJson(response);

  if (!response.ok) {
    throw normalizeError(response.status, data);
  }

  return data;
}

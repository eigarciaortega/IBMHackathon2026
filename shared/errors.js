'use strict';

/**
 * Contrato de error uniforme y middleware de errores compartidos entre servicios.
 *
 * Todas las respuestas de error siguen el formato:
 *   { "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": ["horaFin"] } }
 *
 * Códigos HTTP normalizados (R14):
 *   400 validación, 401 autenticación, 403 autorización,
 *   404 inexistente, 409 solapamiento, 500 error no controlado.
 *
 * El módulo es deliberadamente framework-light: las factorías construyen objetos
 * planos y la clase `ApiError` transporta el `statusCode`. Los middlewares dependen
 * solo de la firma `(req, res, next)` / `(err, req, res, next)` de Express, sin
 * acoplarse a ninguna otra API del framework.
 */

/**
 * Códigos de error de dominio mapeados a su código HTTP por defecto.
 * @readonly
 */
const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 400,
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  NOT_FOUND: 404,
  OVERLAP_CONFLICT: 409,
  INTERNAL_ERROR: 500,
});

/**
 * Construye el cuerpo del contrato de error uniforme.
 *
 * @param {Object} params
 * @param {string} params.code - Código de dominio (p. ej. "VALIDATION_ERROR").
 * @param {string} params.message - Mensaje legible para el consumidor.
 * @param {string[]} [params.fields] - Campos afectados; se omite si está vacío.
 * @returns {{ error: { code: string, message: string, fields?: string[] } }}
 */
function buildErrorBody({ code, message, fields }) {
  const error = {
    code: typeof code === 'string' && code.length > 0 ? code : 'INTERNAL_ERROR',
    message: typeof message === 'string' ? message : '',
  };

  if (Array.isArray(fields) && fields.length > 0) {
    error.fields = fields.slice();
  }

  return { error };
}

/**
 * Error de aplicación que transporta el código HTTP y el contrato de error.
 * Se lanza desde la lógica de negocio y lo captura el middleware global.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - Código HTTP (400, 401, 403, 404, 409, 500...).
   * @param {string} code - Código de dominio del contrato de error.
   * @param {string} message - Mensaje legible.
   * @param {string[]} [fields] - Campos afectados (opcional).
   */
  constructor(statusCode, code, message, fields) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = Array.isArray(fields) ? fields.slice() : undefined;
  }

  /**
   * Serializa el error al contrato uniforme.
   * @returns {{ error: { code: string, message: string, fields?: string[] } }}
   */
  toBody() {
    return buildErrorBody({ code: this.code, message: this.message, fields: this.fields });
  }
}

// --- Factorías de errores por código HTTP normalizado ---

/** 400 - Error de validación (campos, rango, fecha, JSON malformado). */
function validationError(message, fields) {
  return new ApiError(400, 'VALIDATION_ERROR', message, fields);
}

/** 401 - Autenticación requerida (token ausente, expirado o inválido). */
function authenticationError(message = 'Se requiere autenticación') {
  return new ApiError(401, 'AUTHENTICATION_ERROR', message);
}

/** 403 - Permisos insuficientes o recurso ajeno. */
function authorizationError(message = 'Permisos insuficientes') {
  return new ApiError(403, 'AUTHORIZATION_ERROR', message);
}

/** 404 - Identificador de recurso inexistente. */
function notFoundError(message = 'Recurso no encontrado') {
  return new ApiError(404, 'NOT_FOUND', message);
}

/** 409 - Solapamiento de reservas. */
function overlapError(message = 'La reserva solapa con otra existente', fields) {
  return new ApiError(409, 'OVERLAP_CONFLICT', message, fields);
}

/** 500 - Error interno no controlado. */
function internalError(message = 'Error interno del servidor') {
  return new ApiError(500, 'INTERNAL_ERROR', message);
}

/**
 * Middleware de parseo de JSON malformado.
 *
 * Se monta inmediatamente después de `express.json()`. El parser de body
 * arroja un `SyntaxError` con la propiedad `body` cuando el cuerpo no es JSON
 * válido; este middleware lo traduce a un 400 con el contrato uniforme (R14.4).
 *
 * @returns {(err: any, req: object, res: object, next: Function) => void}
 */
function jsonParseErrorHandler() {
  return function jsonParseError(err, req, res, next) {
    const isJsonSyntaxError =
      err instanceof SyntaxError &&
      Object.prototype.hasOwnProperty.call(err, 'body') &&
      (err.status === 400 || err.statusCode === 400);

    if (isJsonSyntaxError) {
      return res
        .status(400)
        .json(
          buildErrorBody({
            code: 'VALIDATION_ERROR',
            message: 'El cuerpo de la solicitud contiene JSON malformado',
          }),
        );
    }

    return next(err);
  };
}

/**
 * Middleware global de captura de excepciones.
 *
 * Se monta como último middleware del stack. Si el error es un `ApiError`
 * conocido responde con su código y contrato; cualquier otro error se trata
 * como no controlado y responde 500 sin filtrar detalles internos (R14.8).
 *
 * @param {Object} [options]
 * @param {(err: any) => void} [options.logger] - Hook opcional para registrar el error.
 * @returns {(err: any, req: object, res: object, next: Function) => void}
 */
function globalErrorHandler(options = {}) {
  const logger = typeof options.logger === 'function' ? options.logger : null;

  return function globalError(err, req, res, next) {
    // Si la respuesta ya empezó a enviarse, delegar al manejador por defecto.
    if (res.headersSent) {
      return next(err);
    }

    if (err instanceof ApiError) {
      return res.status(err.statusCode).json(err.toBody());
    }

    // Error no controlado: registrar el detalle internamente, no exponerlo.
    if (logger) {
      logger(err);
    }

    return res.status(500).json(
      buildErrorBody({
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servidor',
      }),
    );
  };
}

module.exports = {
  ERROR_CODES,
  ApiError,
  buildErrorBody,
  validationError,
  authenticationError,
  authorizationError,
  notFoundError,
  overlapError,
  internalError,
  jsonParseErrorHandler,
  globalErrorHandler,
};

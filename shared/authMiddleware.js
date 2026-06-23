'use strict';

/**
 * Middleware compartido de autenticación y autorización JWT.
 *
 * Reutilizado por catalog-service y booking-service para proteger sus
 * Endpoint_Protegido. Se apoya en el contrato de error uniforme de `errors.js`:
 * los fallos se propagan vía `next(ApiError)` para que el `globalErrorHandler`
 * responda con el código y cuerpo normalizados.
 *
 * Reglas (R2):
 *   - Token ausente, expirado o con firma inválida  → 401 (R2.1, R14.5).
 *   - Rol insuficiente para la operación solicitada  → 403 (R2.2, R14.6).
 *
 * El token es HS256, firmado con `JWT_SECRET`, y transporta los claims
 * `sub` (identificador de usuario) y `role` (ADMINISTRADOR | COLABORADOR),
 * con una validez de 3600 s. Tras verificarlo, el middleware adjunta
 * `{ sub, role }` a `req.user`.
 */

const jwt = require('jsonwebtoken');
const { authenticationError, authorizationError } = require('./errors');

/**
 * Jerarquía de roles. Un rol satisface el permiso requerido cuando su nivel
 * es mayor o igual al exigido. ADMINISTRADOR es un superconjunto de
 * COLABORADOR: queda autorizado para toda operación permitida a COLABORADOR
 * además de las operaciones administrativas (R2.3, R2.4).
 * @readonly
 */
const ROLE_LEVELS = Object.freeze({
  COLABORADOR: 1,
  ADMINISTRADOR: 2,
});

/**
 * Extrae el token Bearer de la cabecera Authorization.
 *
 * Acepta el esquema "Bearer <token>" de forma case-insensitive en el esquema
 * y tolerante a espacios. Devuelve `null` si la cabecera está ausente o no
 * sigue el formato esperado.
 *
 * @param {object} req - Solicitud Express.
 * @returns {string|null} El token, o `null` si no hay uno válido en la cabecera.
 */
function extractBearerToken(req) {
  const header =
    req && req.headers && typeof req.headers.authorization === 'string'
      ? req.headers.authorization
      : '';

  if (!header) {
    return null;
  }

  const match = /^Bearer[ \t]+(.+)$/i.exec(header.trim());
  if (!match) {
    return null;
  }

  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

/**
 * Resuelve el secreto de firma a usar para verificar el JWT.
 * Prioriza el valor inyectado por configuración y cae a `JWT_SECRET`.
 *
 * @param {string} [configuredSecret]
 * @returns {string|undefined}
 */
function resolveSecret(configuredSecret) {
  if (typeof configuredSecret === 'string' && configuredSecret.length > 0) {
    return configuredSecret;
  }
  return process.env.JWT_SECRET;
}

/**
 * Crea el middleware de autenticación que verifica el Token_JWT.
 *
 * Extrae el Bearer token, verifica firma y expiración (HS256, `JWT_SECRET`),
 * y adjunta `{ sub, role }` a `req.user`. Si el token está ausente, expirado
 * o tiene firma inválida, propaga un error 401 (R2.1, R14.5).
 *
 * @param {object} [options]
 * @param {string} [options.secret] - Secreto de firma; por defecto `process.env.JWT_SECRET`.
 * @returns {(req: object, res: object, next: Function) => void}
 */
function authMiddleware(options = {}) {
  return function authenticate(req, res, next) {
    const token = extractBearerToken(req);

    if (!token) {
      return next(authenticationError('Se requiere un token de autenticación'));
    }

    const secret = resolveSecret(options.secret);
    if (!secret) {
      // Configuración ausente: no es posible verificar el token de forma segura.
      return next(authenticationError('No se pudo verificar el token de autenticación'));
    }

    let payload;
    try {
      payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    } catch (err) {
      // TokenExpiredError, JsonWebTokenError (firma inválida), NotBeforeError → 401.
      const message =
        err && err.name === 'TokenExpiredError'
          ? 'El token de autenticación ha expirado'
          : 'El token de autenticación es inválido';
      return next(authenticationError(message));
    }

    req.user = { sub: payload.sub, role: payload.role };
    return next();
  };
}

/**
 * Crea un middleware de autorización que exige un Rol mínimo.
 *
 * Debe montarse después de `authMiddleware`. Autoriza la operación si el `role`
 * del token alcanza el nivel requerido según `ROLE_LEVELS`; de lo contrario
 * propaga un error 403 (R2.2, R14.6). ADMINISTRADOR queda autorizado para
 * operaciones permitidas a COLABORADOR (R2.3).
 *
 * @param {string} requiredRole - Rol mínimo requerido (ADMINISTRADOR | COLABORADOR).
 * @returns {(req: object, res: object, next: Function) => void}
 */
function requireRole(requiredRole) {
  const requiredLevel = ROLE_LEVELS[requiredRole];

  return function authorize(req, res, next) {
    // Sin usuario autenticado en la solicitud: falta autenticación (debe montarse
    // después de authMiddleware).
    if (!req || !req.user) {
      return next(authenticationError('Se requiere autenticación'));
    }

    const userLevel = ROLE_LEVELS[req.user.role];

    // Rol desconocido, rol requerido desconocido o nivel insuficiente → 403.
    if (userLevel === undefined || requiredLevel === undefined || userLevel < requiredLevel) {
      return next(authorizationError('Permisos insuficientes para esta operación'));
    }

    return next();
  };
}

module.exports = {
  ROLE_LEVELS,
  extractBearerToken,
  authMiddleware,
  requireRole,
};

'use strict';

/**
 * app.js — construcción de la aplicación Express del auth-service.
 *
 * Expone una factoría `createAuthApp` que recibe sus dependencias por inyección
 * (repositorio de usuarios, secreto JWT, reloj) de modo que la app pueda
 * importarse y probarse sin abrir un puerto ni requerir una base de datos viva.
 *
 * Endpoints (R1):
 *   - POST /auth/login   → 200 | 400 | 401 | 429
 *   - GET  /auth/verify  → 200 | 401
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const {
  validateLoginInput,
  verifyCredentials,
} = require('./credentialValidator');
const {
  normalizeState,
  isLocked,
  registerFailure,
  registerSuccess,
} = require('./loginAttemptTracker');

const {
  validationError,
  authenticationError,
  authMiddleware,
  jsonParseErrorHandler,
  globalErrorHandler,
} = require('../../shared');

const { mountAuthApiDocs } = require('./openapi');

/** Validez por defecto del Token_JWT en segundos (R1.1). */
const DEFAULT_JWT_EXPIRES_IN = 3600;

/**
 * Deriva el estado del tracker de intentos a partir de un registro de `usuario`.
 *
 * Traduce la columna `locked_until` (DATETIME) a epoch en milisegundos para que
 * la lógica pura de `loginAttemptTracker` opere de forma determinista.
 *
 * @param {object} userRecord
 * @returns {{ failedAttempts: number, lockedUntil: number|null }}
 */
function trackerStateFromRecord(userRecord) {
  const lockedUntilMs =
    userRecord && userRecord.locked_until
      ? new Date(userRecord.locked_until).getTime()
      : null;
  return normalizeState({
    failedAttempts: userRecord ? userRecord.failed_attempts : 0,
    lockedUntil: Number.isFinite(lockedUntilMs) ? lockedUntilMs : null,
  });
}

/**
 * Crea la app Express del auth-service con sus dependencias inyectadas.
 *
 * @param {Object} deps
 * @param {{ findByEmail: Function, updateLoginState: Function }} deps.userRepository
 *   - Repositorio de acceso a la tabla `usuario`.
 * @param {string} [deps.jwtSecret] - Secreto HS256; por defecto `process.env.JWT_SECRET`.
 * @param {number} [deps.jwtExpiresIn] - Validez del token en segundos (por defecto 3600).
 * @param {() => number} [deps.now] - Reloj inyectable (epoch ms) para determinismo.
 * @returns {import('express').Express}
 */
function createAuthApp(deps = {}) {
  const userRepository = deps.userRepository;
  if (!userRepository) {
    throw new Error('createAuthApp requiere un userRepository');
  }

  const jwtSecret = deps.jwtSecret || process.env.JWT_SECRET;
  const jwtExpiresIn = Number.isInteger(deps.jwtExpiresIn)
    ? deps.jwtExpiresIn
    : Number.parseInt(process.env.JWT_EXPIRES_IN, 10) || DEFAULT_JWT_EXPIRES_IN;
  const nowFn = typeof deps.now === 'function' ? deps.now : () => Date.now();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(jsonParseErrorHandler());

  // --- POST /auth/login ---
  app.post('/auth/login', async (req, res, next) => {
    try {
      const body = req.body || {};
      const { usuario, password } = body;

      // 1. Validación de formato/longitud de entrada (R1.3) → 400.
      const validation = validateLoginInput({ usuario, password });
      if (!validation.valid) {
        return next(
          validationError('Credenciales con formato inválido', validation.fields),
        );
      }

      const now = nowFn();

      // 2. Buscar el Usuario por email.
      const userRecord = await userRepository.findByEmail(usuario);

      // 3. Verificar bloqueo por intentos fallidos previos (R1.4) → 429.
      if (userRecord) {
        const state = trackerStateFromRecord(userRecord);
        if (isLocked(state, now)) {
          return res.status(429).json({
            error: {
              code: 'TOO_MANY_ATTEMPTS',
              message:
                'Cuenta bloqueada temporalmente por demasiados intentos fallidos',
            },
          });
        }
      }

      // 4. Verificar credenciales contra el hash almacenado.
      const result = await verifyCredentials({ password }, userRecord);

      if (result.authenticated) {
        // Éxito: reiniciar contador de intentos y emitir Token_JWT (R1.1).
        if (userRecord) {
          await userRepository.updateLoginState(userRecord.id_usuario, registerSuccess());
        }

        if (!jwtSecret) {
          return next(new Error('JWT_SECRET no configurado'));
        }

        const token = jwt.sign({ sub: result.sub, role: result.role }, jwtSecret, {
          algorithm: 'HS256',
          expiresIn: jwtExpiresIn,
        });

        return res.status(200).json({
          token,
          role: result.role,
          expiresIn: jwtExpiresIn,
        });
      }

      // 5. Fallo de credenciales.
      if (userRecord) {
        // Registrar el fallo y persistir el nuevo estado (R1.4).
        const prevState = trackerStateFromRecord(userRecord);
        const nextState = registerFailure(prevState, now);
        await userRepository.updateLoginState(userRecord.id_usuario, nextState);

        // Si este fallo dispara el bloqueo (5º consecutivo) → 429.
        if (isLocked(nextState, now)) {
          return res.status(429).json({
            error: {
              code: 'TOO_MANY_ATTEMPTS',
              message:
                'Cuenta bloqueada temporalmente por demasiados intentos fallidos',
            },
          });
        }
      }

      // Credenciales inválidas (Usuario inexistente o contraseña incorrecta) → 401.
      return next(authenticationError('Usuario o contraseña incorrectos'));
    } catch (err) {
      return next(err);
    }
  });

  // --- GET /auth/verify ---
  // Valida el Token_JWT mediante el middleware compartido y devuelve { sub, role }.
  app.get('/auth/verify', authMiddleware({ secret: jwtSecret }), (req, res) => {
    return res.status(200).json({ sub: req.user.sub, role: req.user.role });
  });

  // --- Documentación OpenAPI/Swagger en /api-docs (R13.1-R13.5) ---
  // Montaje aislado: si la carga de la spec falla, /api-docs responde 503 sin
  // afectar al resto de endpoints.
  mountAuthApiDocs(app, { logger: typeof deps.logger === 'function' ? deps.logger : undefined });

  // Middleware global de errores (último del stack).
  app.use(globalErrorHandler());

  return app;
}

module.exports = {
  DEFAULT_JWT_EXPIRES_IN,
  trackerStateFromRecord,
  createAuthApp,
};

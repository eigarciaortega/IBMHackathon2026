import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import jwt from 'jsonwebtoken';
import auth from './authMiddleware.js';

const { authMiddleware } = auth;

/**
 * Feature: officespace-management, Property 8
 *
 * Property 8: Autenticación requerida en endpoints protegidos.
 *
 * For any solicitud a un Endpoint_Protegido cuyo Token_JWT esté ausente,
 * expirado o con firma inválida, el sistema SHALL rechazarla con código HTTP
 * 401 sin ejecutar la operación.
 *
 * Validates: Requirements 2.1, 14.5
 */

const SECRET = 'test-secret-officespace';

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
});

/** Construye una solicitud con (opcionalmente) la cabecera Authorization. */
function makeReq(authorization) {
  const req = { headers: {} };
  if (authorization !== undefined) {
    req.headers.authorization = authorization;
  }
  return req;
}

/** Roles válidos para los claims de los tokens generados. */
const roleArb = fc.constantFrom('COLABORADOR', 'ADMINISTRADOR');

/**
 * Generador de solicitudes con Token_JWT ausente: cabecera Authorization
 * inexistente, vacía, con esquema distinto de Bearer, o "Bearer" sin token.
 */
const absentTokenReqArb = fc.oneof(
  fc.constant(undefined),
  fc.constant(''),
  fc.constant('Bearer'),
  fc.constant('Bearer '),
  fc.string().map((s) => `Basic ${s}`),
).map(makeReq);

/**
 * Generador de solicitudes con un token malformado: cadenas arbitrarias que no
 * constituyen un JWT HS256 válido firmado con el secreto.
 */
const malformedTokenReqArb = fc
  .string({ minLength: 1, maxLength: 80 })
  // Evitar generar (por casualidad) un token válido o cadenas vacías que el
  // extractor descarta como "ausente".
  .filter((s) => s.trim().length > 0)
  .map((s) => makeReq(`Bearer ${s}`));

/**
 * Generador de solicitudes con un token de firma inválida: JWT bien formado
 * pero firmado con un secreto distinto del que usa el middleware.
 */
const wrongSignatureReqArb = fc
  .record({
    sub: fc.string({ minLength: 1, maxLength: 24 }),
    role: roleArb,
    wrongSecret: fc.string({ minLength: 1, maxLength: 32 }).filter((s) => s !== SECRET),
  })
  .map(({ sub, role, wrongSecret }) => {
    const token = jwt.sign({ sub, role }, wrongSecret, { algorithm: 'HS256', expiresIn: 3600 });
    return makeReq(`Bearer ${token}`);
  });

/**
 * Generador de solicitudes con un token expirado: firmado con el secreto
 * correcto pero con expiración en el pasado (expiresIn negativo).
 */
const expiredTokenReqArb = fc
  .record({
    sub: fc.string({ minLength: 1, maxLength: 24 }),
    role: roleArb,
    expiredBy: fc.integer({ min: 1, max: 100000 }),
  })
  .map(({ sub, role, expiredBy }) => {
    const token = jwt.sign({ sub, role }, SECRET, { algorithm: 'HS256', expiresIn: -expiredBy });
    return makeReq(`Bearer ${token}`);
  });

/** Cualquier solicitud que debe ser rechazada con 401. */
const invalidRequestArb = fc.oneof(
  absentTokenReqArb,
  malformedTokenReqArb,
  wrongSignatureReqArb,
  expiredTokenReqArb,
);

describe('Feature: officespace-management, Property 8 - Autenticación requerida en endpoints protegidos', () => {
  it('rechaza con 401 (sin ejecutar la operación) todo token ausente, malformado, con firma inválida o expirado', () => {
    fc.assert(
      fc.property(invalidRequestArb, (req) => {
        const next = vi.fn();
        const middleware = authMiddleware({ secret: SECRET });

        middleware(req, {}, next);

        // El middleware debe haber rechazado vía next(err) exactamente una vez.
        expect(next).toHaveBeenCalledTimes(1);

        const err = next.mock.calls[0][0];

        // Debe propagar un ApiError de autenticación (no debe pasar control sin error).
        expect(err).toBeDefined();
        expect(err).not.toBeNull();
        expect(err.statusCode).toBe(401);
        expect(err.code).toBe('AUTHENTICATION_ERROR');

        // La operación protegida NO debe ejecutarse: no se adjunta usuario.
        expect(req.user).toBeUndefined();
      }),
      { numRuns: 200 },
    );
  });
});

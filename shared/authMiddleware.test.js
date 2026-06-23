import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import auth from './authMiddleware.js';

const { ROLE_LEVELS, extractBearerToken, authMiddleware, requireRole } = auth;

const SECRET = 'test-secret-officespace';

/** Crea una solicitud simulada con la cabecera Authorization indicada. */
function makeReq(authorization, user) {
  const req = { headers: {} };
  if (authorization !== undefined) {
    req.headers.authorization = authorization;
  }
  if (user !== undefined) {
    req.user = user;
  }
  return req;
}

/** Firma un token HS256 con los claims indicados. */
function sign(claims, options = {}) {
  return jwt.sign(claims, SECRET, { algorithm: 'HS256', ...options });
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
});

describe('extractBearerToken', () => {
  it('extrae el token de "Bearer <token>"', () => {
    expect(extractBearerToken(makeReq('Bearer abc.def.ghi'))).toBe('abc.def.ghi');
  });

  it('es tolerante a mayúsculas en el esquema y espacios', () => {
    expect(extractBearerToken(makeReq('  bearer   abc.def  '))).toBe('abc.def');
  });

  it('devuelve null si la cabecera está ausente', () => {
    expect(extractBearerToken(makeReq())).toBeNull();
  });

  it('devuelve null ante un esquema distinto de Bearer', () => {
    expect(extractBearerToken(makeReq('Basic abc'))).toBeNull();
  });

  it('devuelve null cuando no hay token tras el esquema', () => {
    expect(extractBearerToken(makeReq('Bearer '))).toBeNull();
  });
});

describe('authMiddleware', () => {
  it('verifica un token válido y adjunta { sub, role } a req.user', () => {
    const token = sign({ sub: 'u-123', role: 'COLABORADOR' }, { expiresIn: 3600 });
    const req = makeReq(`Bearer ${token}`);
    const next = vi.fn();

    authMiddleware({ secret: SECRET })(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ sub: 'u-123', role: 'COLABORADOR' });
  });

  it('usa process.env.JWT_SECRET cuando no se inyecta secreto', () => {
    const token = sign({ sub: 'u-1', role: 'ADMINISTRADOR' }, { expiresIn: 3600 });
    const req = makeReq(`Bearer ${token}`);
    const next = vi.fn();

    authMiddleware()(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user.role).toBe('ADMINISTRADOR');
  });

  it('rechaza con 401 cuando el token está ausente', () => {
    const next = vi.fn();
    authMiddleware({ secret: SECRET })(makeReq(), {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rechaza con 401 cuando la firma es inválida', () => {
    const token = sign({ sub: 'u-1', role: 'COLABORADOR' }, { expiresIn: 3600 });
    const req = makeReq(`Bearer ${token}`);
    const next = vi.fn();

    // Verificado con un secreto distinto → firma inválida.
    authMiddleware({ secret: 'otro-secreto' })(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(req.user).toBeUndefined();
  });

  it('rechaza con 401 cuando el token está expirado', () => {
    const token = sign({ sub: 'u-1', role: 'COLABORADOR' }, { expiresIn: -10 });
    const req = makeReq(`Bearer ${token}`);
    const next = vi.fn();

    authMiddleware({ secret: SECRET })(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/expirado/i);
  });

  it('rechaza con 401 un token firmado con un algoritmo no permitido', () => {
    // Token "none" (sin firma) no debe aceptarse bajo HS256.
    const token = jwt.sign({ sub: 'u-1', role: 'ADMINISTRADOR' }, '', { algorithm: 'none' });
    const req = makeReq(`Bearer ${token}`);
    const next = vi.fn();

    authMiddleware({ secret: SECRET })(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });
});

describe('requireRole', () => {
  it('autoriza a un COLABORADOR en una operación de COLABORADOR', () => {
    const next = vi.fn();
    requireRole('COLABORADOR')(makeReq(undefined, { sub: 'u', role: 'COLABORADOR' }), {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('autoriza a un ADMINISTRADOR en una operación de ADMINISTRADOR', () => {
    const next = vi.fn();
    requireRole('ADMINISTRADOR')(makeReq(undefined, { sub: 'u', role: 'ADMINISTRADOR' }), {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('autoriza a un ADMINISTRADOR en una operación de COLABORADOR (superconjunto)', () => {
    const next = vi.fn();
    requireRole('COLABORADOR')(makeReq(undefined, { sub: 'u', role: 'ADMINISTRADOR' }), {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rechaza con 403 a un COLABORADOR en una operación de ADMINISTRADOR', () => {
    const next = vi.fn();
    requireRole('ADMINISTRADOR')(makeReq(undefined, { sub: 'u', role: 'COLABORADOR' }), {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('AUTHORIZATION_ERROR');
  });

  it('rechaza con 401 cuando no hay usuario autenticado en la solicitud', () => {
    const next = vi.fn();
    requireRole('COLABORADOR')(makeReq(), {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('rechaza con 403 cuando el rol del usuario es desconocido', () => {
    const next = vi.fn();
    requireRole('COLABORADOR')(makeReq(undefined, { sub: 'u', role: 'INVITADO' }), {}, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });
});

describe('integración authMiddleware + requireRole', () => {
  it('encadena verificación de token y autorización por rol', () => {
    const token = sign({ sub: 'admin-1', role: 'ADMINISTRADOR' }, { expiresIn: 3600 });
    const req = makeReq(`Bearer ${token}`);

    const next1 = vi.fn();
    authMiddleware({ secret: SECRET })(req, {}, next1);
    expect(next1).toHaveBeenCalledWith();

    const next2 = vi.fn();
    requireRole('ADMINISTRADOR')(req, {}, next2);
    expect(next2).toHaveBeenCalledWith();
  });

  it('expone la jerarquía de roles esperada', () => {
    expect(ROLE_LEVELS.ADMINISTRADOR).toBeGreaterThan(ROLE_LEVELS.COLABORADOR);
  });
});

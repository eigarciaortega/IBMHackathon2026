import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createAuthApp } from './app.js';

/**
 * Pruebas de endpoint del auth-service (tarea 2.5).
 *
 * Usan un `userRepository` mockeado (sin MySQL vivo) y arrancan la app en un
 * puerto efímero para ejercitar las rutas reales vía HTTP. Verifican los
 * caminos 200 / 400 / 401 / 429 de POST /auth/login y GET /auth/verify, además
 * de los claims (`sub`, `role`, expiración 3600 s) del Token_JWT emitido.
 */

const JWT_SECRET = 'test-secret-clave-larga-para-pruebas';
const PASSWORD = 'Admin123';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 8);

/** Instante fijo para pruebas deterministas de bloqueo. */
const FIXED_NOW = 1_700_000_000_000;

/**
 * Crea un userRepository mockeado a partir de una lista de registros.
 * Registra las llamadas a updateLoginState para poder inspeccionarlas.
 */
function makeRepo(records = []) {
  const byEmail = new Map(records.map((r) => [r.email, r]));
  const updates = [];
  return {
    updates,
    async findByEmail(email) {
      return byEmail.has(email) ? { ...byEmail.get(email) } : null;
    },
    async updateLoginState(idUsuario, state) {
      updates.push({ idUsuario, state });
    },
  };
}

function adminRecord(overrides = {}) {
  return {
    id_usuario: 1,
    nombre: 'Administrador Alpha',
    email: 'admin@corporativoalpha.com',
    password_hash: PASSWORD_HASH,
    rol: 'ADMINISTRADOR',
    activo: 1,
    failed_attempts: 0,
    locked_until: null,
    ...overrides,
  };
}

/** Arranca la app en un puerto efímero y devuelve { server, baseUrl }. */
function startApp(deps) {
  const app = createAuthApp({ jwtSecret: JWT_SECRET, now: () => FIXED_NOW, ...deps });
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

let ctx;

afterEach(async () => {
  if (ctx && ctx.server) {
    await new Promise((resolve) => ctx.server.close(resolve));
    ctx = null;
  }
});

async function login(baseUrl, body, asJson = true) {
  return fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: asJson ? JSON.stringify(body) : body,
  });
}

describe('POST /auth/login', () => {
  it('200: emite Token_JWT con claims sub y role y expiresIn 3600', async () => {
    const repo = makeRepo([adminRecord()]);
    ctx = await startApp({ userRepository: repo });

    const res = await login(ctx.baseUrl, {
      usuario: 'admin@corporativoalpha.com',
      password: PASSWORD,
    });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.role).toBe('ADMINISTRADOR');
    expect(data.expiresIn).toBe(3600);
    expect(typeof data.token).toBe('string');

    const decoded = jwt.verify(data.token, JWT_SECRET, { algorithms: ['HS256'] });
    expect(decoded.sub).toBe(1);
    expect(decoded.role).toBe('ADMINISTRADOR');
    // expiración = iat + 3600 s.
    expect(decoded.exp - decoded.iat).toBe(3600);

    // Login exitoso reinicia el contador de intentos.
    expect(repo.updates).toEqual([
      { idUsuario: 1, state: { failedAttempts: 0, lockedUntil: null } },
    ]);
  });

  it('400: entrada inválida (usuario ausente) sin emitir token', async () => {
    const repo = makeRepo([adminRecord()]);
    ctx = await startApp({ userRepository: repo });

    const res = await login(ctx.baseUrl, { password: PASSWORD });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.fields).toContain('usuario');
  });

  it('400: cuerpo JSON malformado', async () => {
    const repo = makeRepo([adminRecord()]);
    ctx = await startApp({ userRepository: repo });

    const res = await login(ctx.baseUrl, '{ malformado', false);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('401: contraseña incorrecta de un usuario existente', async () => {
    const repo = makeRepo([adminRecord()]);
    ctx = await startApp({ userRepository: repo });

    const res = await login(ctx.baseUrl, {
      usuario: 'admin@corporativoalpha.com',
      password: 'incorrecta',
    });
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error.code).toBe('AUTHENTICATION_ERROR');
    // Persiste un fallo (failedAttempts = 1).
    expect(repo.updates[0].state.failedAttempts).toBe(1);
  });

  it('401: usuario inexistente sin emitir token', async () => {
    const repo = makeRepo([]);
    ctx = await startApp({ userRepository: repo });

    const res = await login(ctx.baseUrl, {
      usuario: 'noexiste@corporativoalpha.com',
      password: PASSWORD,
    });
    expect(res.status).toBe(401);
    // No hay registro que actualizar para usuarios desconocidos.
    expect(repo.updates).toEqual([]);
  });

  it('429: cuenta previamente bloqueada (locked_until en el futuro)', async () => {
    const lockedUntilMs = FIXED_NOW + 60_000;
    const repo = makeRepo([
      adminRecord({
        failed_attempts: 5,
        locked_until: new Date(lockedUntilMs).toISOString(),
      }),
    ]);
    ctx = await startApp({ userRepository: repo });

    const res = await login(ctx.baseUrl, {
      usuario: 'admin@corporativoalpha.com',
      password: PASSWORD,
    });
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error.code).toBe('TOO_MANY_ATTEMPTS');
  });

  it('429: el 5º fallo consecutivo dispara el bloqueo', async () => {
    const repo = makeRepo([adminRecord({ failed_attempts: 4, locked_until: null })]);
    ctx = await startApp({ userRepository: repo });

    const res = await login(ctx.baseUrl, {
      usuario: 'admin@corporativoalpha.com',
      password: 'incorrecta',
    });
    expect(res.status).toBe(429);

    // Se persistió el bloqueo: 5 intentos y lockedUntil = now + 300 s.
    expect(repo.updates[0].state.failedAttempts).toBe(5);
    expect(repo.updates[0].state.lockedUntil).toBe(FIXED_NOW + 300_000);
  });
});

describe('GET /auth/verify', () => {
  it('200: token válido devuelve { sub, role }', async () => {
    const repo = makeRepo([adminRecord()]);
    ctx = await startApp({ userRepository: repo });

    const token = jwt.sign({ sub: 1, role: 'ADMINISTRADOR' }, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: 3600,
    });

    const res = await fetch(`${ctx.baseUrl}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ sub: 1, role: 'ADMINISTRADOR' });
  });

  it('401: token ausente', async () => {
    const repo = makeRepo([adminRecord()]);
    ctx = await startApp({ userRepository: repo });

    const res = await fetch(`${ctx.baseUrl}/auth/verify`);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('401: token con firma inválida', async () => {
    const repo = makeRepo([adminRecord()]);
    ctx = await startApp({ userRepository: repo });

    const token = jwt.sign({ sub: 1, role: 'ADMINISTRADOR' }, 'otro-secreto', {
      algorithm: 'HS256',
    });
    const res = await fetch(`${ctx.baseUrl}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });
});

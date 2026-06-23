import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { crearApp } from './app.js';

/**
 * Pruebas de endpoint (tarea 7.4) para:
 *   - GET    /reservas/mias  (R7.1, R7.2)
 *   - DELETE /reservas/:id   (R7.3-R7.7)
 *
 * Usan un `reservaRepository` simulado (sin MySQL en vivo) y arrancan la app en
 * un puerto efímero para ejercer el stack HTTP real (auth + rol + handlers).
 */

const SECRET = 'test-secret-booking';

/** Instante de referencia (UTC) inyectado como "ahora". */
const AHORA = new Date('2025-06-01T00:00:00Z');

/** Firma un Token_JWT HS256 con el Rol indicado. */
function token(role, sub = 'u-1') {
  return jwt.sign({ sub, role }, SECRET, { algorithm: 'HS256', expiresIn: 3600 });
}

const COLAB = (sub = 'u-1') => token('COLABORADOR', sub);
const ADMIN = (sub = 'a-1') => token('ADMINISTRADOR', sub);

/** Construye una Reserva simulada. */
function reserva(overrides = {}) {
  return {
    id_reserva: 1,
    id_espacio: 1,
    id_usuario: 'u-1',
    fecha_inicio: '2025-12-01T09:00:00Z',
    fecha_fin: '2025-12-01T10:00:00Z',
    cantidad_asistentes: 4,
    estado_reserva: 'Activo',
    estado_asistencia: null,
    fecha_creacion: '2025-05-01T00:00:00Z',
    fecha_cancelacion: null,
    ...overrides,
  };
}

/**
 * Repositorio simulado. Registra las llamadas para afirmar "no se canceló" en
 * los casos 401/403/404/400.
 */
function makeRepo(overrides = {}) {
  const calls = { listar: [], obtener: [], cancelar: [] };
  const repo = {
    listarReservasDeUsuario: async (idUsuario) => {
      calls.listar.push(idUsuario);
      return [];
    },
    obtenerReservaPorId: async (id) => {
      calls.obtener.push(id);
      return reserva();
    },
    cancelarReserva: async (id, fecha) => {
      calls.cancelar.push({ id, fecha });
      return reserva({ estado_reserva: 'Cancelado', fecha_cancelacion: fecha });
    },
  };
  Object.assign(repo, overrides);
  repo.__calls = calls;
  return repo;
}

/** Arranca la app en un puerto efímero y ejecuta `fn` con la base URL. */
async function withServer(app, fn) {
  const server = app.listen(0);
  await new Promise((resolve) => server.on('listening', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    return await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

/** Realiza una petición HTTP y normaliza la respuesta { status, body }. */
async function request(base, method, path, { authToken } = {}) {
  const headers = {};
  if (authToken) headers.authorization = `Bearer ${authToken}`;
  const res = await fetch(base + path, { method, headers });
  const text = await res.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { status: res.status, body: parsed };
}

function appWith(repo) {
  return crearApp({ reservaRepository: repo, jwtSecret: SECRET, ahora: () => AHORA });
}

describe('booking-service GET /reservas/mias (R7.1, R7.2)', () => {
  let repo;
  let app;

  beforeEach(() => {
    repo = makeRepo();
    app = appWith(repo);
  });

  it('sin token → 401', async () => {
    const res = await withServer(app, (base) => request(base, 'GET', '/reservas/mias'));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(repo.__calls.listar).toHaveLength(0);
  });

  it('token sin Rol válido → 403', async () => {
    const res = await withServer(app, (base) =>
      request(base, 'GET', '/reservas/mias', { authToken: token('INVITADO') }),
    );
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    expect(repo.__calls.listar).toHaveLength(0);
  });

  it('Usuario sin Reservas → 200 con colección vacía (R7.2)', async () => {
    const res = await withServer(app, (base) =>
      request(base, 'GET', '/reservas/mias', { authToken: COLAB('user-9') }),
    );
    expect(res.status).toBe(200);
    expect(res.body.reservas).toEqual([]);
    // Consulta exactamente por el sub del token.
    expect(repo.__calls.listar).toEqual(['user-9']);
  });

  it('devuelve solo las Reservas del solicitante (pasadas y futuras) (R7.1)', async () => {
    const propias = [
      reserva({ id_reserva: 1, id_usuario: 'user-9', fecha_inicio: '2024-01-01T09:00:00Z' }),
      reserva({ id_reserva: 2, id_usuario: 'user-9', fecha_inicio: '2026-01-01T09:00:00Z' }),
    ];
    repo = makeRepo({ listarReservasDeUsuario: async () => propias });
    app = appWith(repo);
    const res = await withServer(app, (base) =>
      request(base, 'GET', '/reservas/mias', { authToken: COLAB('user-9') }),
    );
    expect(res.status).toBe(200);
    expect(res.body.reservas).toHaveLength(2);
    expect(res.body.reservas.every((r) => r.id_usuario === 'user-9')).toBe(true);
  });
});

describe('booking-service DELETE /reservas/:id (R7.3-R7.7)', () => {
  let repo;
  let app;

  beforeEach(() => {
    repo = makeRepo();
    app = appWith(repo);
  });

  it('sin token → 401 sin cancelar', async () => {
    const res = await withServer(app, (base) => request(base, 'DELETE', '/reservas/1'));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(repo.__calls.cancelar).toHaveLength(0);
  });

  it('token sin Rol válido → 403 sin cancelar', async () => {
    const res = await withServer(app, (base) =>
      request(base, 'DELETE', '/reservas/1', { authToken: token('INVITADO') }),
    );
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    expect(repo.__calls.cancelar).toHaveLength(0);
  });

  it('Reserva inexistente → 404 sin cancelar (R7.7)', async () => {
    repo = makeRepo({ obtenerReservaPorId: async () => null });
    app = appWith(repo);
    const res = await withServer(app, (base) =>
      request(base, 'DELETE', '/reservas/999', { authToken: COLAB('u-1') }),
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(repo.__calls.cancelar).toHaveLength(0);
  });

  it('Reserva ajena → 403 sin cancelar (R7.6)', async () => {
    repo = makeRepo({
      obtenerReservaPorId: async () => reserva({ id_usuario: 'otro-usuario' }),
    });
    app = appWith(repo);
    const res = await withServer(app, (base) =>
      request(base, 'DELETE', '/reservas/1', { authToken: COLAB('u-1') }),
    );
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    expect(repo.__calls.cancelar).toHaveLength(0);
  });

  it('Reserva propia pasada → 400 sin cancelar (R7.4)', async () => {
    repo = makeRepo({
      obtenerReservaPorId: async () =>
        reserva({ id_usuario: 'u-1', fecha_inicio: '2024-01-01T09:00:00Z' }),
    });
    app = appWith(repo);
    const res = await withServer(app, (base) =>
      request(base, 'DELETE', '/reservas/1', { authToken: COLAB('u-1') }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toContain('fecha_inicio');
    expect(repo.__calls.cancelar).toHaveLength(0);
  });

  it('Reserva propia ya cancelada → 400 sin cancelar (R7.5)', async () => {
    repo = makeRepo({
      obtenerReservaPorId: async () =>
        reserva({ id_usuario: 'u-1', estado_reserva: 'Cancelado' }),
    });
    app = appWith(repo);
    const res = await withServer(app, (base) =>
      request(base, 'DELETE', '/reservas/1', { authToken: COLAB('u-1') }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toContain('estado_reserva');
    expect(repo.__calls.cancelar).toHaveLength(0);
  });

  it('Reserva propia futura y activa → 200 y queda Cancelado con fecha_cancelacion (R7.3)', async () => {
    const res = await withServer(app, (base) =>
      request(base, 'DELETE', '/reservas/1', { authToken: COLAB('u-1') }),
    );
    expect(res.status).toBe(200);
    expect(res.body.reserva.estado_reserva).toBe('Cancelado');
    expect(res.body.reserva.fecha_cancelacion).toBeTruthy();
    expect(repo.__calls.cancelar).toHaveLength(1);
    expect(repo.__calls.cancelar[0].id).toBe('1');
  });

  it('ADMINISTRADOR puede eliminar cualquier Reserva (hard delete) → 200', async () => {
    let eliminadoId = null;
    repo = makeRepo({
      obtenerReservaPorId: async () => reserva({ id_usuario: 'otro-usuario' }),
      eliminarReserva: async (id) => {
        eliminadoId = id;
        return true;
      },
    });
    app = appWith(repo);
    const res = await withServer(app, (base) =>
      request(base, 'DELETE', '/reservas/1', { authToken: ADMIN('a-1') }),
    );
    expect(res.status).toBe(200);
    expect(res.body.eliminado).toBe(true);
    expect(String(eliminadoId)).toBe('1');
  });
});

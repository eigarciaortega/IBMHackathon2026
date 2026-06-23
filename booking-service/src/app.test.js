import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { crearApp } from './app.js';

const SECRET = 'test-secret-booking';

/** Instante de referencia (UTC) inyectado como "ahora" en todas las pruebas. */
const AHORA = new Date('2025-01-01T00:00:00Z');

/** Firma un Token_JWT HS256 con el Rol indicado. */
function token(role, sub = 'u-1') {
  return jwt.sign({ sub, role }, SECRET, { algorithm: 'HS256', expiresIn: 3600 });
}

const COLAB = (sub = 'u-1') => token('COLABORADOR', sub);
const ADMIN = (sub = 'a-1') => token('ADMINISTRADOR', sub);

/** Solicitud de Reserva válida (futura respecto a AHORA). */
const reservaValida = {
  idEspacio: 1,
  fechaInicio: '2025-12-01T09:00:00Z',
  fechaFin: '2025-12-01T10:00:00Z',
  asistentes: 4,
};

/** Espacio destino simulado con capacidad 10. */
const espacioMock = {
  id_espacio: 1,
  nombre: 'Sala Alfa',
  tipo: 'Sala de juntas',
  capacidad: 10,
  piso: 2,
  ubicacion: 'Ala norte',
  activo: 1,
};

/**
 * Construye un repositorio de Reservas simulado. Registra las llamadas a la
 * creación para poder afirmar "no se persistió" en los casos 401/403/400/404.
 */
function makeRepo(overrides = {}) {
  const calls = { obtener: [], crear: [] };
  const repo = {
    obtenerEspacioPorId: async (id) => {
      calls.obtener.push(id);
      return { ...espacioMock };
    },
    crearReservaConVerificacion: async (solicitud) => {
      calls.crear.push(solicitud);
      return {
        reserva: {
          id_reserva: 99,
          id_espacio: solicitud.id_espacio,
          id_usuario: solicitud.id_usuario,
          fecha_inicio: solicitud.fecha_inicio,
          fecha_fin: solicitud.fecha_fin,
          cantidad_asistentes: Number(solicitud.cantidad_asistentes),
          estado_reserva: 'Activo',
          estado_asistencia: null,
          fecha_creacion: '2025-01-01T00:00:00Z',
          fecha_cancelacion: null,
        },
      };
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
async function request(base, method, path, { body, authToken } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (authToken) headers.authorization = `Bearer ${authToken}`;
  const res = await fetch(base + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
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

describe('booking-service POST /reservas (R6, R14)', () => {
  let repo;
  let app;

  beforeEach(() => {
    repo = makeRepo();
    app = crearApp({ reservaRepository: repo, jwtSecret: SECRET, ahora: () => AHORA });
  });

  describe('autenticación requerida (R2.1, R14.5)', () => {
    it('sin token → 401 sin persistir', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'POST', '/reservas', { body: reservaValida }),
      );
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(repo.__calls.crear).toHaveLength(0);
    });
  });

  describe('autorización por Rol (R2.4, R14.6)', () => {
    it('token sin Rol válido → 403 sin persistir', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'POST', '/reservas', {
          body: reservaValida,
          authToken: token('INVITADO'),
        }),
      );
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
      expect(repo.__calls.crear).toHaveLength(0);
    });

    it('ADMINISTRADOR satisface COLABORADOR por jerarquía → 201', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'POST', '/reservas', { body: reservaValida, authToken: ADMIN() }),
      );
      expect(res.status).toBe(201);
    });
  });

  describe('creación exitosa (R6.1, R14.1)', () => {
    it('COLABORADOR con solicitud válida → 201 y Reserva asociada al sub del token', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'POST', '/reservas', {
          body: reservaValida,
          authToken: COLAB('user-42'),
        }),
      );
      expect(res.status).toBe(201);
      expect(res.body.reserva).toMatchObject({
        id_espacio: 1,
        id_usuario: 'user-42',
        cantidad_asistentes: 4,
        estado_reserva: 'Activo',
      });
      // La Reserva se asocia al `sub` del token, no a un id del cuerpo.
      expect(repo.__calls.crear).toHaveLength(1);
      expect(repo.__calls.crear[0].id_usuario).toBe('user-42');
    });

    it('acepta también la convención snake_case del dominio', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'POST', '/reservas', {
          body: {
            id_espacio: 1,
            fecha_inicio: '2025-12-01T09:00:00Z',
            fecha_fin: '2025-12-01T10:00:00Z',
            cantidad_asistentes: 2,
          },
          authToken: COLAB('user-7'),
        }),
      );
      expect(res.status).toBe(201);
      expect(repo.__calls.crear[0].id_usuario).toBe('user-7');
    });
  });

  describe('validación de la solicitud (R6.5, R6.6, R6.7, R14.4)', () => {
    it('fecha_inicio en el pasado → 400 sin persistir', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'POST', '/reservas', {
          body: { ...reservaValida, fechaInicio: '2024-01-01T09:00:00Z' },
          authToken: COLAB(),
        }),
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields).toContain('fecha_inicio');
      expect(repo.__calls.crear).toHaveLength(0);
    });

    it('fecha_fin <= fecha_inicio → 400 sin persistir', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'POST', '/reservas', {
          body: { ...reservaValida, fechaFin: '2025-12-01T09:00:00Z' },
          authToken: COLAB(),
        }),
      );
      expect(res.status).toBe(400);
      expect(res.body.error.fields).toContain('fecha_fin');
      expect(repo.__calls.crear).toHaveLength(0);
    });

    it('asistentes > capacidad del Espacio → 400 sin persistir', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'POST', '/reservas', {
          body: { ...reservaValida, asistentes: 50 },
          authToken: COLAB(),
        }),
      );
      expect(res.status).toBe(400);
      expect(res.body.error.fields).toContain('cantidad_asistentes');
      expect(repo.__calls.crear).toHaveLength(0);
    });
  });

  describe('Espacio inexistente (R6.8, R14.7)', () => {
    it('idEspacio que no existe → 404 sin intentar crear', async () => {
      repo = makeRepo({ obtenerEspacioPorId: async () => null });
      app = crearApp({ reservaRepository: repo, jwtSecret: SECRET, ahora: () => AHORA });
      const res = await withServer(app, (base) =>
        request(base, 'POST', '/reservas', {
          body: { ...reservaValida, idEspacio: 999 },
          authToken: COLAB(),
        }),
      );
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(repo.__calls.crear).toHaveLength(0);
    });
  });

  describe('solapamiento (R6.2, R6.4, R14.3)', () => {
    it('conflicto detectado en la transacción → 409', async () => {
      repo = makeRepo({ crearReservaConVerificacion: async () => ({ conflicto: true }) });
      app = crearApp({ reservaRepository: repo, jwtSecret: SECRET, ahora: () => AHORA });
      const res = await withServer(app, (base) =>
        request(base, 'POST', '/reservas', { body: reservaValida, authToken: COLAB() }),
      );
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('OVERLAP_CONFLICT');
    });
  });

  describe('JSON malformado (R14.4)', () => {
    it('cuerpo no parseable → 400', async () => {
      const res = await withServer(app, async (base) => {
        const r = await fetch(base + '/reservas', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${COLAB()}`,
          },
          body: '{ malformado',
        });
        const body = await r.json();
        return { status: r.status, body };
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});

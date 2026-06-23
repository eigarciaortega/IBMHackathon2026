import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { crearApp } from './app.js';

/**
 * Pruebas de endpoint de `GET /disponibilidad` (tarea 7.1, R5.1-R5.7).
 *
 * Se inyecta un `espacioRepository` simulado (sin MySQL en vivo) y un "ahora"
 * fijo, de modo que las pruebas son deterministas. Verifican:
 *   - 200 con resultados filtrados para una búsqueda válida (R5.1-R5.3).
 *   - 200 con colección vacía cuando no hay coincidencias (R5.7).
 *   - 400 para parámetros faltantes/inválidos sin consultar la BD (R5.4-R5.6).
 *   - 401/403 para autenticación/rol (R2.1, R2.4, R14.5, R14.6).
 */

const SECRET = 'test-secret-booking';

/** Instante de referencia (UTC) inyectado como "ahora" en todas las pruebas. */
const AHORA = new Date('2025-01-01T00:00:00Z');

/** Firma un Token_JWT HS256 con el Rol indicado. */
function token(role, sub = 'u-1') {
  return jwt.sign({ sub, role }, SECRET, { algorithm: 'HS256', expiresIn: 3600 });
}

const COLAB = (sub = 'u-1') => token('COLABORADOR', sub);
const ADMIN = (sub = 'a-1') => token('ADMINISTRADOR', sub);

/** Conjunto de Espacios candidatos simulados. */
const ESPACIOS = [
  { id_espacio: 1, nombre: 'Sala Alfa', tipo: 'Sala de juntas', capacidad: 10, piso: 2, ubicacion: 'Ala norte', activo: 1 },
  { id_espacio: 2, nombre: 'Escritorio B', tipo: 'Escritorio individual', capacidad: 1, piso: 1, ubicacion: 'Ala sur', activo: 1 },
  { id_espacio: 3, nombre: 'Sala Beta', tipo: 'Sala de juntas', capacidad: 4, piso: 3, ubicacion: 'Ala este', activo: 1 },
];

/**
 * Construye un espacioRepository simulado. Registra los criterios recibidos
 * para poder afirmar "no se consultó la BD" en los casos 400/401/403.
 *
 * @param {object} [overrides]
 * @param {object[]} [data.espacios]
 * @param {object[]} [data.reservas]
 */
function makeRepo({ espacios = ESPACIOS, reservas = [] } = {}, overrides = {}) {
  const calls = { consultas: [] };
  const repo = {
    obtenerEspaciosYReservasParaRango: async (criterios) => {
      calls.consultas.push(criterios);
      return { espacios, reservas };
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

/** Realiza una petición GET y normaliza la respuesta { status, body }. */
async function get(base, path, { authToken } = {}) {
  const headers = {};
  if (authToken) headers.authorization = `Bearer ${authToken}`;
  const res = await fetch(base + path, { method: 'GET', headers });
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

/** Query string de una búsqueda válida y futura respecto a AHORA. */
const QS_VALIDA = '?fecha=2025-12-01&horaInicio=09:00&horaFin=10:00';

describe('booking-service GET /disponibilidad (R5, R2, R14)', () => {
  let repo;
  let app;

  beforeEach(() => {
    repo = makeRepo();
    app = crearApp({ espacioRepository: repo, jwtSecret: SECRET, ahora: () => AHORA });
  });

  describe('autenticación requerida (R2.1, R14.5)', () => {
    it('sin token → 401 sin consultar la BD', async () => {
      const res = await withServer(app, (base) => get(base, `/disponibilidad${QS_VALIDA}`));
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(repo.__calls.consultas).toHaveLength(0);
    });
  });

  describe('autorización por Rol (R2.4, R14.6)', () => {
    it('token sin Rol válido → 403 sin consultar la BD', async () => {
      const res = await withServer(app, (base) =>
        get(base, `/disponibilidad${QS_VALIDA}`, { authToken: token('INVITADO') }),
      );
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
      expect(repo.__calls.consultas).toHaveLength(0);
    });

    it('ADMINISTRADOR satisface COLABORADOR por jerarquía → 200', async () => {
      const res = await withServer(app, (base) =>
        get(base, `/disponibilidad${QS_VALIDA}`, { authToken: ADMIN() }),
      );
      expect(res.status).toBe(200);
    });
  });

  describe('búsqueda válida (R5.1, R5.7)', () => {
    it('COLABORADOR sin reservas → 200 con todos los Espacios', async () => {
      const res = await withServer(app, (base) =>
        get(base, `/disponibilidad${QS_VALIDA}`, { authToken: COLAB() }),
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.espacios)).toBe(true);
      expect(res.body.espacios.map((e) => e.id_espacio).sort()).toEqual([1, 2, 3]);
      expect(repo.__calls.consultas).toHaveLength(1);
    });

    it('excluye los Espacios con Solapamiento en el rango (R5.1)', async () => {
      // Reserva activa que solapa el rango 09:00-10:00 en el Espacio 1.
      repo = makeRepo({
        reservas: [
          {
            id_reserva: 50,
            id_espacio: 1,
            fecha_inicio: '2025-12-01T09:30:00Z',
            fecha_fin: '2025-12-01T11:00:00Z',
            estado_reserva: 'Activo',
          },
        ],
      });
      app = crearApp({ espacioRepository: repo, jwtSecret: SECRET, ahora: () => AHORA });
      const res = await withServer(app, (base) =>
        get(base, `/disponibilidad${QS_VALIDA}`, { authToken: COLAB() }),
      );
      expect(res.status).toBe(200);
      expect(res.body.espacios.map((e) => e.id_espacio).sort()).toEqual([2, 3]);
    });

    it('una Reserva consecutiva (límites exclusivos) no excluye el Espacio (R5.1)', async () => {
      // Reserva que termina exactamente cuando empieza el rango buscado → no solapa.
      repo = makeRepo({
        reservas: [
          {
            id_reserva: 51,
            id_espacio: 1,
            fecha_inicio: '2025-12-01T08:00:00Z',
            fecha_fin: '2025-12-01T09:00:00Z',
            estado_reserva: 'Activo',
          },
        ],
      });
      app = crearApp({ espacioRepository: repo, jwtSecret: SECRET, ahora: () => AHORA });
      const res = await withServer(app, (base) =>
        get(base, `/disponibilidad${QS_VALIDA}`, { authToken: COLAB() }),
      );
      expect(res.status).toBe(200);
      expect(res.body.espacios.map((e) => e.id_espacio)).toContain(1);
    });
  });

  describe('filtros de Tipo_Espacio y Capacidad mínima (R5.2, R5.3)', () => {
    it('filtra por tipo', async () => {
      const res = await withServer(app, (base) =>
        get(base, `/disponibilidad${QS_VALIDA}&tipo=Escritorio individual`, {
          authToken: COLAB(),
        }),
      );
      expect(res.status).toBe(200);
      expect(res.body.espacios.map((e) => e.id_espacio)).toEqual([2]);
    });

    it('filtra por capacidad mínima', async () => {
      const res = await withServer(app, (base) =>
        get(base, `/disponibilidad${QS_VALIDA}&capacidadMin=5`, { authToken: COLAB() }),
      );
      expect(res.status).toBe(200);
      // Solo el Espacio 1 (capacidad 10) cumple capacidad >= 5.
      expect(res.body.espacios.map((e) => e.id_espacio)).toEqual([1]);
    });
  });

  describe('colección vacía (R5.7)', () => {
    it('búsqueda válida sin coincidencias → 200 con []', async () => {
      repo = makeRepo({ espacios: [] });
      app = crearApp({ espacioRepository: repo, jwtSecret: SECRET, ahora: () => AHORA });
      const res = await withServer(app, (base) =>
        get(base, `/disponibilidad${QS_VALIDA}`, { authToken: COLAB() }),
      );
      expect(res.status).toBe(200);
      expect(res.body.espacios).toEqual([]);
    });
  });

  describe('validación de la solicitud (R5.4, R5.5, R5.6)', () => {
    it('falta horaFin → 400 sin consultar la BD (R5.6)', async () => {
      const res = await withServer(app, (base) =>
        get(base, '/disponibilidad?fecha=2025-12-01&horaInicio=09:00', { authToken: COLAB() }),
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields).toContain('horaFin');
      expect(repo.__calls.consultas).toHaveLength(0);
    });

    it('horaFin <= horaInicio → 400 sin consultar la BD (R5.4)', async () => {
      const res = await withServer(app, (base) =>
        get(base, '/disponibilidad?fecha=2025-12-01&horaInicio=10:00&horaFin=09:00', {
          authToken: COLAB(),
        }),
      );
      expect(res.status).toBe(400);
      expect(res.body.error.fields).toContain('horaFin');
      expect(repo.__calls.consultas).toHaveLength(0);
    });

    it('fecha/hora en el pasado → 400 sin consultar la BD (R5.5)', async () => {
      const res = await withServer(app, (base) =>
        get(base, '/disponibilidad?fecha=2024-01-01&horaInicio=09:00&horaFin=10:00', {
          authToken: COLAB(),
        }),
      );
      expect(res.status).toBe(400);
      expect(res.body.error.fields).toEqual(expect.arrayContaining(['fecha', 'horaInicio']));
      expect(repo.__calls.consultas).toHaveLength(0);
    });
  });
});

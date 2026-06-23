import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import fc from 'fast-check';
import { crearApp } from './app.js';

/**
 * Feature: officespace-management, Property 12: "Mis Reservas" devuelve exactamente las del solicitante
 *
 * For any conjunto de Reservas de múltiples Usuarios, "Mis Reservas" SHALL
 * devolver exactamente las Reservas cuyo propietario es el solicitante (pasadas
 * y futuras), y una colección vacía cuando no posee ninguna.
 *
 * Validates: Requirements 7.1, 7.2
 *
 * Enfoque: se ejercita el ciclo HTTP real (GET /reservas/mias) del
 * booking-service contra un `reservaRepository` en memoria cuyo
 * `listarReservasDeUsuario(idUsuario)` filtra el dataset generado por
 * `id_usuario`, reproduciendo la semántica del repositorio real
 * (WHERE id_usuario = ?). Por cada iteración se genera un conjunto de Reservas
 * de varios Usuarios (pasadas y futuras) y un solicitante; el resultado
 * esperado se calcula de forma independiente y se compara con la respuesta de
 * la API. La autenticación usa un Token_JWT de Rol COLABORADOR con el `sub` del
 * solicitante.
 */

const SECRET = 'test-secret-booking-prop12';
const NUM_RUNS = 120; // mínimo requerido por diseño: 100

/** Instante de referencia (UTC) inyectado como "ahora". */
const AHORA = new Date('2025-06-01T00:00:00Z');

/** Firma un Token_JWT HS256 de COLABORADOR para el `sub` indicado. */
const COLAB = (sub) =>
  jwt.sign({ sub, role: 'COLABORADOR' }, SECRET, {
    algorithm: 'HS256',
    expiresIn: 3600,
  });

/** Pool de propietarios posibles para las Reservas generadas. */
const USER_POOL = ['u-1', 'u-2', 'u-3', 'u-4'];

/**
 * Pool de solicitantes: incluye los propietarios del pool y un `sub` que nunca
 * posee Reservas ('u-sin-reservas') para ejercer el caso de colección vacía (R7.2).
 */
const REQUESTER_POOL = [...USER_POOL, 'u-sin-reservas'];

const clone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Repositorio de Reservas en memoria. `listarReservasDeUsuario` filtra el
 * dataset actual por `id_usuario`, espejando la semántica del repositorio real.
 * El dataset es reemplazable por iteración mediante `__setDataset`.
 */
function makeInMemoryRepo() {
  let dataset = [];
  return {
    __setDataset(rows) {
      dataset = rows;
    },
    async listarReservasDeUsuario(idUsuario) {
      return dataset.filter((r) => r.id_usuario === idUsuario).map(clone);
    },
  };
}

// --- Generadores ---

/** Día como offset (en días) respecto a AHORA: negativo = pasado, positivo = futuro. */
const offsetDiasArb = fc.integer({ min: -400, max: 400 });

/** Construye una fecha ISO (UTC) a partir de un offset en días respecto a AHORA. */
function fechaDesdeOffset(offsetDias) {
  return new Date(AHORA.getTime() + offsetDias * 24 * 60 * 60 * 1000).toISOString();
}

/** Genera una Reserva (sin id, que se asigna después) propiedad de un Usuario del pool. */
const reservaSinIdArb = fc.record({
  id_usuario: fc.constantFrom(...USER_POOL),
  id_espacio: fc.integer({ min: 1, max: 10 }),
  offsetDias: offsetDiasArb,
  duracionHoras: fc.integer({ min: 1, max: 8 }),
  cantidad_asistentes: fc.integer({ min: 1, max: 20 }),
  estado_reserva: fc.constantFrom('Activo', 'Cancelado'),
});

/** Conjunto de Reservas de múltiples Usuarios (puede ser vacío). */
const datasetArb = fc.array(reservaSinIdArb, { minLength: 0, maxLength: 40 });

/** Solicitante: cualquiera del pool de propietarios o el `sub` sin Reservas. */
const requesterArb = fc.constantFrom(...REQUESTER_POOL);

/** Materializa el dataset asignando ids únicos y fechas concretas. */
function materializarDataset(rows) {
  return rows.map((r, i) => {
    const inicio = fechaDesdeOffset(r.offsetDias);
    const fin = new Date(
      new Date(inicio).getTime() + r.duracionHoras * 60 * 60 * 1000,
    ).toISOString();
    return {
      id_reserva: i + 1,
      id_espacio: r.id_espacio,
      id_usuario: r.id_usuario,
      fecha_inicio: inicio,
      fecha_fin: fin,
      cantidad_asistentes: r.cantidad_asistentes,
      estado_reserva: r.estado_reserva,
      estado_asistencia: null,
      fecha_creacion: AHORA.toISOString(),
      fecha_cancelacion: r.estado_reserva === 'Cancelado' ? AHORA.toISOString() : null,
    };
  });
}

// --- Servidor HTTP (un único arranque; dataset reemplazable por iteración) ---
let repo;
let server;
let base;

beforeAll(async () => {
  repo = makeInMemoryRepo();
  const app = crearApp({ reservaRepository: repo, jwtSecret: SECRET, ahora: () => AHORA });
  server = app.listen(0);
  await new Promise((resolve) => server.on('listening', resolve));
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

/** Petición HTTP normalizada a { status, body }. */
async function request(method, path, { authToken } = {}) {
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

const idsOrdenados = (arr) => arr.map((r) => r.id_reserva).sort((a, b) => a - b);

describe('Property 12: "Mis Reservas" devuelve exactamente las del solicitante (PBT)', () => {
  it('devuelve exactamente las Reservas del solicitante (pasadas y futuras) y [] cuando no posee ninguna (R7.1, R7.2)', async () => {
    await fc.assert(
      fc.asyncProperty(datasetArb, requesterArb, async (rows, requester) => {
        const dataset = materializarDataset(rows);
        repo.__setDataset(dataset);

        // Resultado esperado calculado de forma independiente: exactamente las
        // Reservas cuyo propietario es el solicitante, sin filtrar por fecha ni
        // por estado (pasadas y futuras, activas y canceladas).
        const esperadas = dataset.filter((r) => r.id_usuario === requester);

        const res = await request('GET', '/reservas/mias', { authToken: COLAB(requester) });

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.reservas)).toBe(true);

        // Conjunto exacto: mismos identificadores, sin sobrantes ni faltantes.
        expect(idsOrdenados(res.body.reservas)).toEqual(idsOrdenados(esperadas));

        // Toda Reserva devuelta pertenece al solicitante (ninguna ajena).
        expect(res.body.reservas.every((r) => r.id_usuario === requester)).toBe(true);

        // Caso de colección vacía (R7.2): si no posee Reservas, debe ser [].
        if (esperadas.length === 0) {
          expect(res.body.reservas).toEqual([]);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  }, 60000);
});

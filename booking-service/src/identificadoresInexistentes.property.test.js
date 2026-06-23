import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import jwt from 'jsonwebtoken';
import { crearApp } from './app.js';

/**
 * Prueba basada en propiedades (PBT) de operaciones sobre identificadores
 * inexistentes en el booking-service vía HTTP.
 *
 * Feature: officespace-management, Property 7: Operaciones sobre identificadores
 * inexistentes devuelven 404
 *
 * Para toda operación que referencie un identificador que no existe, el sistema
 * SHALL responder con código HTTP 404 sin realizar ninguna modificación. En el
 * alcance del booking-service esto cubre:
 *   - POST /reservas sobre un Espacio cuyo `id_espacio` no existe → 404.
 *   - DELETE /reservas/{id} sobre una Reserva cuyo `id_reserva` no existe → 404.
 *
 * En ambos casos se verifica además que no se produjo ninguna modificación: no
 * se crea ninguna Reserva y no se cancela ninguna existente (las operaciones de
 * escritura del repositorio nunca se invocan).
 *
 * Validates: Requirements 3.7, 6.8, 7.7, 14.7
 */

const SECRET = 'test-secret-prop7';

/** Instante de referencia (UTC) inyectado como "ahora" en todas las pruebas. */
const AHORA = new Date('2025-01-01T00:00:00Z');
const AHORA_MS = AHORA.getTime();

/** Firma un Token_JWT HS256 de un COLABORADOR con el `sub` indicado. */
function colaboradorToken(sub) {
  return jwt.sign({ sub, role: 'COLABORADOR' }, SECRET, {
    algorithm: 'HS256',
    expiresIn: 3600,
  });
}

// --- Repositorio de Reservas EN MEMORIA --------------------------------------

/**
 * Construye un repositorio de Reservas en memoria (sin MySQL) que registra si
 * las operaciones de escritura fueron invocadas, para poder afirmar que una
 * operación sobre un identificador inexistente NO produjo ninguna modificación.
 *
 * @param {object} options
 * @param {Array<object>} [options.espacios] - Espacios existentes en el catálogo.
 * @param {Array<object>} [options.reservas] - Reservas existentes.
 */
function makeInMemoryRepo({ espacios = [], reservas = [] } = {}) {
  const espacioMap = new Map(espacios.map((e) => [String(e.id_espacio), e]));
  const reservaMap = new Map(reservas.map((r) => [String(r.id_reserva), r]));
  const calls = { crear: 0, cancelar: 0 };

  return {
    calls,
    async obtenerEspacioPorId(id) {
      const e = espacioMap.get(String(id));
      return e ? { ...e } : null;
    },
    async crearReservaConVerificacion(solicitud) {
      // Registrar la invocación: si esto se ejecuta sobre un Espacio
      // inexistente, la propiedad de "ninguna modificación" se incumple.
      calls.crear += 1;
      const reserva = {
        id_reserva: 999000 + calls.crear,
        ...solicitud,
        estado_reserva: 'Activo',
      };
      reservaMap.set(String(reserva.id_reserva), reserva);
      return { reserva };
    },
    async listarReservasDeUsuario(idUsuario) {
      return [...reservaMap.values()].filter(
        (r) => String(r.id_usuario) === String(idUsuario),
      );
    },
    async obtenerReservaPorId(id) {
      const r = reservaMap.get(String(id));
      return r ? { ...r } : null;
    },
    async cancelarReserva(id) {
      // Registrar la invocación: nunca debería ocurrir para una Reserva
      // inexistente.
      calls.cancelar += 1;
      const r = reservaMap.get(String(id));
      if (r) r.estado_reserva = 'Cancelado';
      return r;
    },
  };
}

// --- Helpers de servidor/HTTP (estilo app.test.js) ---------------------------

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

// --- Generadores -------------------------------------------------------------

/** `sub` del solicitante: identificador de Usuario no vacío y estable. */
const subArb = fc.integer({ min: 1, max: 1000000 }).map((n) => `user-${n}`);

/**
 * Escenario para POST /reservas sobre Espacio inexistente: un catálogo de
 * Espacios con ids conocidos y un `id_espacio` objetivo que NO está en él.
 */
const postScenarioArb = fc
  .record({
    existingIds: fc.uniqueArray(fc.integer({ min: 1, max: 100 }), {
      minLength: 0,
      maxLength: 5,
    }),
    missingId: fc.integer({ min: 101, max: 1000 }),
    sub: subArb,
    startOffset: fc.integer({ min: 1, max: 100000000 }),
    dur: fc.integer({ min: 1, max: 100000000 }),
    asistentes: fc.integer({ min: 1, max: 1000 }),
  })
  .map(({ existingIds, missingId, sub, startOffset, dur, asistentes }) => {
    const espacios = existingIds.map((id) => ({
      id_espacio: id,
      nombre: `Espacio ${id}`,
      tipo: 'Sala de juntas',
      capacidad: 1000,
      piso: 1,
      ubicacion: `Ubicación ${id}`,
      activo: 1,
    }));
    const inicio = AHORA_MS + startOffset;
    const fin = inicio + dur;
    return {
      espacios,
      sub,
      // `missingId` (>=101) nunca coincide con `existingIds` (<=100).
      idEspacioInexistente: missingId,
      fechaInicio: new Date(inicio).toISOString(),
      fechaFin: new Date(fin).toISOString(),
      asistentes,
    };
  });

/**
 * Escenario para DELETE /reservas/{id} sobre Reserva inexistente: un conjunto
 * de Reservas con ids conocidos y un `id_reserva` objetivo que NO está en él.
 */
const deleteScenarioArb = fc
  .record({
    existingIds: fc.uniqueArray(fc.integer({ min: 1, max: 100 }), {
      minLength: 0,
      maxLength: 5,
    }),
    missingId: fc.integer({ min: 101, max: 1000 }),
    sub: subArb,
  })
  .map(({ existingIds, missingId, sub }) => {
    const reservas = existingIds.map((id) => ({
      id_reserva: id,
      id_espacio: 1,
      id_usuario: sub,
      fecha_inicio: new Date(AHORA_MS + 100000000).toISOString(),
      fecha_fin: new Date(AHORA_MS + 200000000).toISOString(),
      cantidad_asistentes: 1,
      estado_reserva: 'Activo',
      fecha_cancelacion: null,
    }));
    return {
      reservas,
      sub,
      // `missingId` (>=101) nunca coincide con `existingIds` (<=100).
      idReservaInexistente: missingId,
    };
  });

// --- Propiedad ---------------------------------------------------------------

describe('Feature: officespace-management, Property 7 — operaciones sobre identificadores inexistentes devuelven 404', () => {
  it('POST /reservas sobre un Espacio inexistente responde 404 sin crear ninguna Reserva', async () => {
    await fc.assert(
      fc.asyncProperty(postScenarioArb, async (sc) => {
        const repo = makeInMemoryRepo({ espacios: sc.espacios });
        const app = crearApp({
          reservaRepository: repo,
          jwtSecret: SECRET,
          ahora: () => AHORA,
        });

        await withServer(app, async (base) => {
          const res = await request(base, 'POST', '/reservas', {
            body: {
              idEspacio: sc.idEspacioInexistente,
              fechaInicio: sc.fechaInicio,
              fechaFin: sc.fechaFin,
              asistentes: sc.asistentes,
            },
            authToken: colaboradorToken(sc.sub),
          });

          // R6.8/R14.7 — Espacio inexistente → 404.
          expect(res.status).toBe(404);
          // Ninguna modificación: no se creó ninguna Reserva.
          expect(repo.calls.crear).toBe(0);
          const mias = await request(base, 'GET', '/reservas/mias', {
            authToken: colaboradorToken(sc.sub),
          });
          expect(mias.body.reservas).toHaveLength(0);
        });
      }),
      { numRuns: 100 },
    );
  });

  it('DELETE /reservas/{id} sobre una Reserva inexistente responde 404 sin cancelar ninguna Reserva', async () => {
    await fc.assert(
      fc.asyncProperty(deleteScenarioArb, async (sc) => {
        const repo = makeInMemoryRepo({ reservas: sc.reservas });
        const app = crearApp({
          reservaRepository: repo,
          jwtSecret: SECRET,
          ahora: () => AHORA,
        });

        await withServer(app, async (base) => {
          const res = await request(
            base,
            'DELETE',
            `/reservas/${sc.idReservaInexistente}`,
            { authToken: colaboradorToken(sc.sub) },
          );

          // R7.7/R14.7 — Reserva inexistente → 404.
          expect(res.status).toBe(404);
          // Ninguna modificación: no se canceló ninguna Reserva.
          expect(repo.calls.cancelar).toBe(0);
          for (const r of sc.reservas) {
            const actual = await repo.obtenerReservaPorId(r.id_reserva);
            expect(actual.estado_reserva).toBe('Activo');
          }
        });
      }),
      { numRuns: 100 },
    );
  });
});

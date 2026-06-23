import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import jwt from 'jsonwebtoken';
import { crearApp } from './app.js';

/**
 * Prueba basada en propiedades (PBT) de la creación de Reservas vía HTTP.
 *
 * Feature: officespace-management, Property 6: Creación de Reserva válida y
 * propiedad del solicitante
 *
 * Para toda solicitud de Reserva válida (sin solapamiento, rango y fecha
 * válidos, Asistentes dentro de la Capacidad del Espacio y Espacio existente),
 * el Servicio_Reservas SHALL crear la Reserva asociada al Usuario solicitante
 * (el `sub` del Token_JWT) y responder con código HTTP 201, y la Reserva creada
 * SHALL ser recuperable con los mismos datos enviados (vía GET /reservas/mias).
 *
 * Validates: Requirements 6.1, 14.1
 */

const SECRET = 'test-secret-prop6';

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
 * Construye un repositorio de Reservas en memoria (sin MySQL). Implementa la
 * interfaz que consume `app.js`:
 *   - `obtenerEspacioPorId`: devuelve el Espacio generado (con su capacidad).
 *   - `crearReservaConVerificacion`: almacena y devuelve la Reserva creada con
 *     un id y `estado_reserva = 'Activo'` asociada al `id_usuario` solicitante.
 *   - `listarReservasDeUsuario` / `obtenerReservaPorId`: permiten recuperar la
 *     Reserva creada para verificar el round-trip de datos.
 *
 * @param {Array<object>} espacios - Espacios existentes en el catálogo simulado.
 */
function makeInMemoryRepo(espacios) {
  const espacioMap = new Map(espacios.map((e) => [String(e.id_espacio), e]));
  const reservas = [];
  let seq = 0;

  return {
    async obtenerEspacioPorId(id) {
      const e = espacioMap.get(String(id));
      return e ? { ...e } : null;
    },
    async crearReservaConVerificacion(solicitud) {
      seq += 1;
      const reserva = {
        id_reserva: seq,
        id_espacio: solicitud.id_espacio,
        id_usuario: solicitud.id_usuario,
        fecha_inicio: solicitud.fecha_inicio,
        fecha_fin: solicitud.fecha_fin,
        cantidad_asistentes: Number(solicitud.cantidad_asistentes),
        estado_reserva: 'Activo',
        estado_asistencia: null,
        fecha_creacion: AHORA.toISOString(),
        fecha_cancelacion: null,
      };
      reservas.push(reserva);
      return { reserva };
    },
    async listarReservasDeUsuario(idUsuario) {
      return reservas.filter((r) => String(r.id_usuario) === String(idUsuario));
    },
    async obtenerReservaPorId(id) {
      return reservas.find((r) => String(r.id_reserva) === String(id)) || null;
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

/** Catálogo de 1..5 Espacios con ids distintos y Capacidad válida (1..1000). */
const espaciosArb = fc
  .uniqueArray(fc.integer({ min: 1, max: 50 }), { minLength: 1, maxLength: 5 })
  .chain((ids) =>
    fc.tuple(
      ...ids.map((id) =>
        fc.record({
          id_espacio: fc.constant(id),
          nombre: fc.constant(`Espacio ${id}`),
          tipo: fc.constantFrom('Sala de juntas', 'Escritorio individual'),
          capacidad: fc.integer({ min: 1, max: 1000 }),
          piso: fc.integer({ min: 0, max: 20 }),
          ubicacion: fc.constant(`Ubicación ${id}`),
          activo: fc.constant(1),
        }),
      ),
    ),
  );

/**
 * Escenario de Reserva VÁLIDA: Espacio existente, rango futuro (fin > inicio) y
 * Asistentes dentro de 1..capacidad del Espacio destino.
 */
const scenarioArb = fc
  .record({
    espacios: espaciosArb,
    sub: subArb,
    targetIndex: fc.nat(),
    // Desplazamiento estrictamente futuro respecto a AHORA (1 ms .. ~27 h).
    startOffset: fc.integer({ min: 1, max: 100000000 }),
    // Duración del rango (fin > inicio garantizado).
    dur: fc.integer({ min: 1, max: 100000000 }),
    aFactor: fc.integer({ min: 0, max: 999 }),
  })
  .map(({ espacios, sub, targetIndex, startOffset, dur, aFactor }) => {
    const espacio = espacios[targetIndex % espacios.length];
    const inicio = AHORA_MS + startOffset;
    const fin = inicio + dur;
    const asistentes = 1 + (aFactor % espacio.capacidad); // 1..capacidad
    return {
      espacios,
      sub,
      espacio,
      fechaInicio: new Date(inicio).toISOString(),
      fechaFin: new Date(fin).toISOString(),
      asistentes,
    };
  });

// --- Propiedad ---------------------------------------------------------------

describe('POST /reservas — Feature: officespace-management, Property 6', () => {
  it('crea la Reserva (201) asociada al sub del token y la hace recuperable con los mismos datos', async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (sc) => {
        const repo = makeInMemoryRepo(sc.espacios);
        const app = crearApp({
          reservaRepository: repo,
          jwtSecret: SECRET,
          ahora: () => AHORA,
        });

        await withServer(app, async (base) => {
          const cuerpo = {
            idEspacio: sc.espacio.id_espacio,
            fechaInicio: sc.fechaInicio,
            fechaFin: sc.fechaFin,
            asistentes: sc.asistentes,
          };

          // R6.1/R14.1 — Creación válida → 201 con la Reserva asociada al sub.
          const res = await request(base, 'POST', '/reservas', {
            body: cuerpo,
            authToken: colaboradorToken(sc.sub),
          });
          expect(res.status).toBe(201);
          const creada = res.body.reserva;
          expect(creada).toBeDefined();
          expect(creada.id_usuario).toBe(sc.sub);
          expect(creada.estado_reserva).toBe('Activo');
          expect(creada).toMatchObject({
            id_espacio: sc.espacio.id_espacio,
            fecha_inicio: sc.fechaInicio,
            fecha_fin: sc.fechaFin,
            cantidad_asistentes: sc.asistentes,
          });

          // La Reserva creada es recuperable con los mismos datos enviados.
          const mias = await request(base, 'GET', '/reservas/mias', {
            authToken: colaboradorToken(sc.sub),
          });
          expect(mias.status).toBe(200);
          const recuperada = mias.body.reservas.find(
            (r) => r.id_reserva === creada.id_reserva,
          );
          expect(recuperada).toBeDefined();
          expect(recuperada).toMatchObject({
            id_espacio: sc.espacio.id_espacio,
            id_usuario: sc.sub,
            fecha_inicio: sc.fechaInicio,
            fecha_fin: sc.fechaFin,
            cantidad_asistentes: sc.asistentes,
            estado_reserva: 'Activo',
          });
        });
      }),
      { numRuns: 100 },
    );
  });
});

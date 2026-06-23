import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import jwt from 'jsonwebtoken';
import { crearApp } from './app.js';
import { overlapDetector } from './overlapDetector.js';

/**
 * Prueba basada en propiedades (PBT) de la atomicidad ante fallos en el
 * Servicio_Reservas, ejercitada de extremo a extremo vía HTTP.
 *
 * Feature: officespace-management, Property 20: Atomicidad ante fallos
 *
 * Para toda operación que falle (validación, conflicto de solapamiento o error
 * no controlado), el sistema SHALL conservar el estado persistido previo a la
 * operación sin aplicar cambios parciales. Esta prueba cubre la creación
 * (`POST /reservas`) y la cancelación (`DELETE /reservas/:id`) de Reservas:
 * para cualquier solicitud que termine en un código de error (>= 400), el
 * conjunto persistido de Reservas tras la operación SHALL ser idéntico al
 * estado previo.
 *
 * El repositorio en memoria modela la semántica transaccional real del
 * `reservaRepository` (begin/commit/rollback): toda escritura opera sobre una
 * copia de trabajo que solo se "confirma" si no se produce ningún error; un
 * conflicto de solapamiento o un error no controlado descarta la copia, de modo
 * que el estado confirmado nunca refleja cambios parciales.
 *
 * Validates: Requirements 12.3, 14.4, 14.8
 */

const SECRET = 'test-secret-prop20';

/** Instante de referencia (UTC) inyectado como "ahora" en todas las pruebas. */
const AHORA = new Date('2025-06-01T12:00:00Z');
const AHORA_MS = AHORA.getTime();
const HORA = 3600 * 1000;

/** Identificador estable del Usuario solicitante para los casos de cancelación. */
const REQUESTER = 'requester-1';

/** Firma un Token_JWT HS256 de un COLABORADOR con el `sub` indicado. */
function colaboradorToken(sub) {
  return jwt.sign({ sub, role: 'COLABORADOR' }, SECRET, {
    algorithm: 'HS256',
    expiresIn: 3600,
  });
}

/** Construye una cadena ISO 8601 (UTC) desplazada `h` horas respecto a AHORA. */
function isoOffsetH(h) {
  return new Date(AHORA_MS + h * HORA).toISOString();
}

// --- Repositorio de Reservas EN MEMORIA con semántica transaccional ----------

/**
 * Repositorio de Reservas en memoria que reproduce la atomicidad del repositorio
 * real: las escrituras trabajan sobre una copia y solo se confirman si no hay
 * error; un conflicto o un error no controlado descartan la copia (rollback),
 * dejando el estado confirmado intacto.
 *
 * @param {object} cfg
 * @param {Array<object>} cfg.espacios - Catálogo de Espacios (con capacidad).
 * @param {Array<object>} cfg.reservasIniciales - Estado persistido inicial.
 * @param {Array<string>} [cfg.crashEspacioIds] - Espacios cuya creación lanza error (500).
 * @param {Array<string>} [cfg.crashReservaIds] - Reservas cuya cancelación lanza error (500).
 */
function makeTxRepo({ espacios, reservasIniciales, crashEspacioIds = [], crashReservaIds = [] }) {
  const espacioMap = new Map(espacios.map((e) => [String(e.id_espacio), e]));
  // Estado CONFIRMADO (persistido). Las escrituras solo lo reemplazan al commit.
  let store = reservasIniciales.map((r) => ({ ...r }));
  const crashEspacios = new Set(crashEspacioIds.map(String));
  const crashReservas = new Set(crashReservaIds.map(String));
  let seq = 100000;

  return {
    /** Vuelca una copia profunda del estado confirmado para tomar instantáneas. */
    dump() {
      return store.map((r) => ({ ...r }));
    },

    async obtenerEspacioPorId(id) {
      const e = espacioMap.get(String(id));
      return e ? { ...e } : null;
    },

    async crearReservaConVerificacion(solicitud) {
      // Verificación de solapamiento contra las Reservas activas del Espacio.
      const candidatas = store.filter(
        (r) =>
          String(r.id_espacio) === String(solicitud.id_espacio) &&
          r.estado_reserva !== 'Cancelado',
      );
      const reservaSolicitada = {
        id_espacio: solicitud.id_espacio,
        fecha_inicio: solicitud.fecha_inicio,
        fecha_fin: solicitud.fecha_fin,
      };
      if (overlapDetector(reservaSolicitada, candidatas)) {
        // Conflicto: rollback (no se confirma ninguna copia).
        return { conflicto: true };
      }

      // Copia de trabajo: simula el INSERT dentro de la transacción.
      seq += 1;
      const nueva = {
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
      const working = store.map((r) => ({ ...r }));
      working.push(nueva);

      // Error no controlado tras la escritura → rollback (la copia se descarta).
      if (crashEspacios.has(String(solicitud.id_espacio))) {
        throw new Error('Error no controlado simulado durante la creación');
      }

      // Commit: el estado confirmado adopta la copia de trabajo.
      store = working;
      return { reserva: { ...nueva } };
    },

    async listarReservasDeUsuario(idUsuario) {
      return store
        .filter((r) => String(r.id_usuario) === String(idUsuario))
        .map((r) => ({ ...r }));
    },

    async obtenerReservaPorId(id) {
      const r = store.find((x) => String(x.id_reserva) === String(id));
      return r ? { ...r } : null;
    },

    async cancelarReserva(idReserva, fechaCancelacion) {
      // Copia de trabajo: aplica el UPDATE solo si la Reserva no está cancelada.
      const working = store.map((r) => ({ ...r }));
      const idx = working.findIndex((r) => String(r.id_reserva) === String(idReserva));
      if (idx >= 0 && working[idx].estado_reserva !== 'Cancelado') {
        working[idx].estado_reserva = 'Cancelado';
        working[idx].fecha_cancelacion = fechaCancelacion;
      }

      // Error no controlado tras la escritura → rollback (la copia se descarta).
      if (crashReservas.has(String(idReserva))) {
        throw new Error('Error no controlado simulado durante la cancelación');
      }

      // Commit: el estado confirmado adopta la copia de trabajo.
      store = working;
      return idx >= 0 ? { ...working[idx] } : null;
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

/** Instantánea estable y comparable del estado persistido de Reservas. */
function snapshot(reservas) {
  return JSON.stringify(
    [...reservas].sort((a, b) => a.id_reserva - b.id_reserva),
  );
}

// --- Generadores -------------------------------------------------------------

/** `sub` del solicitante para los escenarios de creación. */
const subArb = fc.integer({ min: 1, max: 1000000 }).map((n) => `user-${n}`);

/** Reserva activa pre-existente sobre el Espacio 1, ventana [+10h, +11h]. */
function overlapSeed() {
  return {
    id_reserva: 1000,
    id_espacio: 1,
    id_usuario: 'owner-x',
    fecha_inicio: isoOffsetH(10),
    fecha_fin: isoOffsetH(11),
    cantidad_asistentes: 1,
    estado_reserva: 'Activo',
    estado_asistencia: null,
    fecha_creacion: AHORA.toISOString(),
    fecha_cancelacion: null,
  };
}

/**
 * Escenario de CREACIÓN que falla. Para cada `failMode` construye una solicitud
 * que termina deterministamente en un código de error concreto, sin alterar el
 * estado persistido inicial (la Reserva semilla de solapamiento).
 */
const creationFailureArb = fc
  .record({
    failMode: fc.constantFrom('past', 'badRange', 'capacity', 'notFound', 'overlap', 'crash'),
    capacidad: fc.integer({ min: 1, max: 100 }),
    sub: subArb,
    offset: fc.integer({ min: 1, max: 48 }),
  })
  .map(({ failMode, capacidad, sub, offset }) => {
    const espacios = [
      {
        id_espacio: 1,
        nombre: 'Espacio 1',
        tipo: 'Sala de juntas',
        capacidad,
        piso: 1,
        ubicacion: 'Ubicación 1',
        activo: 1,
      },
    ];
    const reservasIniciales = [overlapSeed()];

    let body;
    let expectedStatus;
    let crashEspacioIds = [];

    if (failMode === 'past') {
      // R6.5 — fecha_inicio anterior a AHORA → 400.
      body = {
        idEspacio: 1,
        fechaInicio: isoOffsetH(-offset),
        fechaFin: isoOffsetH(-offset + 1),
        asistentes: 1,
      };
      expectedStatus = 400;
    } else if (failMode === 'badRange') {
      // R6.6 — fecha_fin <= fecha_inicio → 400.
      const inicio = isoOffsetH(offset);
      body = { idEspacio: 1, fechaInicio: inicio, fechaFin: inicio, asistentes: 1 };
      expectedStatus = 400;
    } else if (failMode === 'capacity') {
      // R6.7 — asistentes > capacidad → 400.
      body = {
        idEspacio: 1,
        fechaInicio: isoOffsetH(offset),
        fechaFin: isoOffsetH(offset + 1),
        asistentes: capacidad + 1,
      };
      expectedStatus = 400;
    } else if (failMode === 'notFound') {
      // R6.8 — Espacio inexistente → 404.
      body = {
        idEspacio: 9999,
        fechaInicio: isoOffsetH(offset),
        fechaFin: isoOffsetH(offset + 1),
        asistentes: 1,
      };
      expectedStatus = 404;
    } else if (failMode === 'overlap') {
      // R6.2/R6.4 — Solapa con la Reserva semilla [+10h, +11h] → 409.
      body = {
        idEspacio: 1,
        fechaInicio: isoOffsetH(10.5),
        fechaFin: isoOffsetH(11.5),
        asistentes: 1,
      };
      expectedStatus = 409;
    } else {
      // crash — solicitud válida (sin solapamiento) cuyo repositorio lanza un
      // error no controlado durante la creación → 500 (R14.8).
      body = {
        idEspacio: 1,
        fechaInicio: isoOffsetH(100),
        fechaFin: isoOffsetH(101),
        asistentes: 1,
      };
      expectedStatus = 500;
      crashEspacioIds = ['1'];
    }

    return {
      kind: 'creation',
      sub,
      setup: { espacios, reservasIniciales, crashEspacioIds, crashReservaIds: [] },
      method: 'POST',
      path: '/reservas',
      body,
      expectedStatus,
    };
  });

/** Conjunto de Reservas persistidas para los escenarios de cancelación. */
function cancellationSeed() {
  return [
    // Propia, futura, activa → cancelable (objetivo del caso 'crash').
    {
      id_reserva: 2001,
      id_espacio: 1,
      id_usuario: REQUESTER,
      fecha_inicio: isoOffsetH(20),
      fecha_fin: isoOffsetH(21),
      cantidad_asistentes: 1,
      estado_reserva: 'Activo',
      estado_asistencia: null,
      fecha_creacion: AHORA.toISOString(),
      fecha_cancelacion: null,
    },
    // Ajena, futura, activa → 403 al intentar cancelarla el solicitante.
    {
      id_reserva: 2002,
      id_espacio: 1,
      id_usuario: 'other-user',
      fecha_inicio: isoOffsetH(20),
      fecha_fin: isoOffsetH(21),
      cantidad_asistentes: 1,
      estado_reserva: 'Activo',
      estado_asistencia: null,
      fecha_creacion: AHORA.toISOString(),
      fecha_cancelacion: null,
    },
    // Propia pero ya cancelada → 400.
    {
      id_reserva: 2003,
      id_espacio: 1,
      id_usuario: REQUESTER,
      fecha_inicio: isoOffsetH(20),
      fecha_fin: isoOffsetH(21),
      cantidad_asistentes: 1,
      estado_reserva: 'Cancelado',
      estado_asistencia: null,
      fecha_creacion: AHORA.toISOString(),
      fecha_cancelacion: isoOffsetH(-1),
    },
    // Propia pero pasada → 400.
    {
      id_reserva: 2004,
      id_espacio: 1,
      id_usuario: REQUESTER,
      fecha_inicio: isoOffsetH(-20),
      fecha_fin: isoOffsetH(-19),
      cantidad_asistentes: 1,
      estado_reserva: 'Activo',
      estado_asistencia: null,
      fecha_creacion: AHORA.toISOString(),
      fecha_cancelacion: null,
    },
  ];
}

/**
 * Escenario de CANCELACIÓN que falla. Cada `failMode` apunta a una Reserva
 * semilla concreta que provoca un código de error sin mutar el estado.
 */
const cancellationFailureArb = fc
  .record({
    failMode: fc.constantFrom('notFound', 'notOwner', 'alreadyCancelled', 'past', 'crash'),
  })
  .map(({ failMode }) => {
    const reservasIniciales = cancellationSeed();
    let targetId;
    let expectedStatus;
    let crashReservaIds = [];

    if (failMode === 'notFound') {
      targetId = 9999; // R7.7 → 404.
      expectedStatus = 404;
    } else if (failMode === 'notOwner') {
      targetId = 2002; // R7.6 → 403.
      expectedStatus = 403;
    } else if (failMode === 'alreadyCancelled') {
      targetId = 2003; // R7.5 → 400.
      expectedStatus = 400;
    } else if (failMode === 'past') {
      targetId = 2004; // R7.4 → 400.
      expectedStatus = 400;
    } else {
      // crash — cancelación autorizada (propia, futura, activa) cuyo repositorio
      // lanza un error no controlado → 500 (R14.8).
      targetId = 2001;
      expectedStatus = 500;
      crashReservaIds = ['2001'];
    }

    return {
      kind: 'cancellation',
      sub: REQUESTER,
      setup: { espacios: [], reservasIniciales, crashEspacioIds: [], crashReservaIds },
      method: 'DELETE',
      path: `/reservas/${targetId}`,
      body: undefined,
      expectedStatus,
    };
  });

/** Unión de operaciones fallidas de creación y cancelación. */
const failingOperationArb = fc.oneof(creationFailureArb, cancellationFailureArb);

// --- Propiedad ---------------------------------------------------------------

describe('Feature: officespace-management, Property 20: Atomicidad ante fallos', () => {
  it('conserva el estado persistido de Reservas tras cualquier operación fallida (validación, conflicto o error no controlado)', async () => {
    await fc.assert(
      fc.asyncProperty(failingOperationArb, async (sc) => {
        const repo = makeTxRepo(sc.setup);
        const app = crearApp({
          reservaRepository: repo,
          jwtSecret: SECRET,
          ahora: () => AHORA,
          logger: () => {}, // silencia el log de errores 500 esperados.
        });

        const estadoPrevio = snapshot(repo.dump());

        await withServer(app, async (base) => {
          const res = await request(base, sc.method, sc.path, {
            body: sc.body,
            authToken: colaboradorToken(sc.sub),
          });

          // La operación efectivamente falla con el código de error esperado.
          expect(res.status).toBe(sc.expectedStatus);
          expect(res.status).toBeGreaterThanOrEqual(400);

          // Atomicidad: el estado persistido es idéntico al previo (sin cambios
          // parciales) — R12.3, R14.4, R14.8.
          const estadoPosterior = snapshot(repo.dump());
          expect(estadoPosterior).toBe(estadoPrevio);
        });
      }),
      { numRuns: 100 },
    );
  });
});

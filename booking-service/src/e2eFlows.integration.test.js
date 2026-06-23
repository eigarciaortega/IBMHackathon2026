/**
 * e2eFlows.integration.test.js — Pruebas de integración extremo a extremo
 * (tarea 10.2) que ejercitan los flujos reales del sistema contra una base de
 * datos MySQL de prueba, atravesando auth-service y booking-service con sus
 * repositorios y transacciones reales (sin mocks de la capa de datos).
 *
 * Cobertura:
 *   - Flujo completo: login → búsqueda → reserva → mis reservas → cancelación.
 *     (_Requirements: 6.1, 7.1, 7.3_)
 *   - Concurrencia: dos reservas simultáneas sobre el mismo Espacio/fecha/rango;
 *     solo una se crea (201) y la otra obtiene 409. (_Requirements: 6.2, 14.3_)
 *   - Atomicidad real (rollback): un fallo durante la escritura transaccional
 *     no deja cambios parciales persistidos. (_Requirements: 14.3 / Property 20_)
 *   - Smoke de la documentación: GET /api-docs(.json) devuelve una
 *     especificación OpenAPI válida. (_Requirements: 13.1_)
 *
 * Disponibilidad de base de datos (prefiriendo ser ejecutable):
 *   La suite intenta conectarse a un MySQL configurable mediante variables de
 *   entorno (con valores por defecto de desarrollo). Si la conexión o la
 *   preparación del esquema no es posible, la suite se OMITE con un mensaje
 *   claro en lugar de fallar, de modo que pueda ejecutarse tal cual en CI/local
 *   cuando hay un MySQL disponible.
 *
 *   Variables de entorno reconocidas (todas opcionales):
 *     DB_TEST_HOST      (def. DB_HOST != 'db' || '127.0.0.1')
 *     DB_TEST_PORT      (def. DB_PORT || 3306)
 *     DB_TEST_USER      (def. DB_USER || 'root')
 *     DB_TEST_PASSWORD  (def. DB_PASSWORD || '')
 *     DB_TEST_NAME      (def. 'officespace_e2e_test')
 */

import { describe, it, expect, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

import { crearApp } from './app.js';
import { createReservaRepository } from './reservaRepository.js';
import { createAvailabilityRepository } from './availabilityRepository.js';
import { createAuthApp } from '../../auth-service/src/app.js';
import { createUserRepository } from '../../auth-service/src/userRepository.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(HERE, '..', '..', 'db', 'init', '01_schema.sql');

/** Secreto JWT compartido por ambos servicios durante la prueba. */
const SECRET = 'e2e-integration-secret-officespace';

/** Instante de referencia (UTC) inyectado como "ahora" en el booking-service. */
const AHORA = new Date('2025-01-01T00:00:00Z');

/** Nombre del esquema de prueba aislado. */
const TEST_DB = process.env.DB_TEST_NAME || 'officespace_e2e_test';

/**
 * Hashes bcrypt estables (generados con bcryptjs, cost=10) verificables por el
 * auth-service. Se incrustan para sembrar usuarios sin depender de bcrypt en
 * tiempo de ejecución del booking-service.
 *   ADMIN_HASH ↔ "Admin123"   USER_HASH ↔ "User123"
 */
const ADMIN_HASH = '$2a$10$t9S4K8a9jce7mmEWBq/vDeaGU.30RChlc5ttI.j3ZSZuqOCv8Vp5O';
const USER_HASH = '$2a$10$XU4Zk21A4rKuQEvMkW4FXuPM00OzNT.MqW6TS0bw5jn2p0ZR9DlF6';

/** Construye la configuración de conexión a partir del entorno. */
function dbConn(withDatabase) {
  const host =
    process.env.DB_TEST_HOST ||
    (process.env.DB_HOST && process.env.DB_HOST !== 'db' ? process.env.DB_HOST : '127.0.0.1');
  return {
    host,
    port: Number(process.env.DB_TEST_PORT || process.env.DB_PORT || 3306),
    user: process.env.DB_TEST_USER || process.env.DB_USER || 'root',
    password: process.env.DB_TEST_PASSWORD || process.env.DB_PASSWORD || '',
    ...(withDatabase ? { database: TEST_DB } : {}),
    multipleStatements: true,
    connectTimeout: 4000,
    timezone: 'Z',
  };
}

/** Estado compartido del entorno de prueba. */
const ctx = {
  available: false,
  reason: '',
  pool: null,
  authServer: null,
  bookingServer: null,
  authBase: '',
  bookingBase: '',
  ids: {},
};

/** Arranca una app Express en un puerto efímero y resuelve su base URL. */
async function listen(app) {
  const server = app.listen(0);
  await new Promise((resolve) => server.on('listening', resolve));
  const { port } = server.address();
  return { server, base: `http://127.0.0.1:${port}` };
}

/** Realiza una petición HTTP y normaliza la respuesta { status, body }. */
async function request(base, method, urlPath, { body, authToken } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (authToken) headers.authorization = `Bearer ${authToken}`;
  const res = await fetch(base + urlPath, {
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

/**
 * Prepara el esquema de prueba (drop + create + DDL), siembra usuarios y
 * Espacios, cablea los repositorios/aplicaciones reales y arranca los servidores.
 * Lanza si no hay un MySQL accesible (la suite se omite en ese caso).
 */
async function setup() {
  // 1. Crear/limpiar el esquema de prueba aislado.
  const admin = await mysql.createConnection(dbConn(false));
  try {
    await admin.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
    await admin.query(
      `CREATE DATABASE \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await admin.query(`USE \`${TEST_DB}\``);

    // Cargar el DDL real del proyecto, redirigido al esquema de prueba.
    const ddl = fs
      .readFileSync(SCHEMA_PATH, 'utf8')
      .replace(/\bofficespace\b/g, TEST_DB);
    await admin.query(ddl);
  } finally {
    await admin.end();
  }

  // 2. Pool ligado al esquema de prueba.
  ctx.pool = mysql.createPool({ ...dbConn(true), connectionLimit: 8, waitForConnections: true });

  // 3. Sembrar usuarios (R1.5-R1.7) con hashes verificables.
  const [adminRes] = await ctx.pool.query(
    `INSERT INTO usuario (nombre, email, password_hash, rol, activo)
     VALUES (?, ?, ?, 'ADMINISTRADOR', 1)`,
    ['Administrador Alpha', 'admin@corporativoalpha.com', ADMIN_HASH],
  );
  ctx.ids.adminId = adminRes.insertId;

  const [carlosRes] = await ctx.pool.query(
    `INSERT INTO usuario (nombre, email, password_hash, rol, activo)
     VALUES (?, ?, ?, 'COLABORADOR', 1)`,
    ['Carlos Méndez', 'carlos.mendez@corporativoalpha.com', USER_HASH],
  );
  ctx.ids.carlosId = carlosRes.insertId;

  const [anaRes] = await ctx.pool.query(
    `INSERT INTO usuario (nombre, email, password_hash, rol, activo)
     VALUES (?, ?, ?, 'COLABORADOR', 1)`,
    ['Ana Torres', 'ana.torres@corporativoalpha.com', USER_HASH],
  );
  ctx.ids.anaId = anaRes.insertId;

  // 4. Sembrar Espacios.
  const [salaA] = await ctx.pool.query(
    `INSERT INTO espacio (nombre, tipo, capacidad, piso, ubicacion, activo)
     VALUES ('Sala Alfa', 'Sala de juntas', 10, 2, 'Ala norte', 1)`,
  );
  ctx.ids.salaA = salaA.insertId;

  const [salaB] = await ctx.pool.query(
    `INSERT INTO espacio (nombre, tipo, capacidad, piso, ubicacion, activo)
     VALUES ('Sala Beta', 'Sala de juntas', 8, 3, 'Ala sur', 1)`,
  );
  ctx.ids.salaB = salaB.insertId;

  await ctx.pool.query(
    `INSERT INTO espacio (nombre, tipo, capacidad, piso, ubicacion, activo)
     VALUES ('Escritorio C1', 'Escritorio individual', 1, 1, 'Open space', 1)`,
  );

  // 5. Reserva preexistente de Ana (para verificar el filtrado de "Mis Reservas").
  const [anaReserva] = await ctx.pool.query(
    `INSERT INTO reserva (fecha_inicio, fecha_fin, id_espacio, id_usuario, cantidad_asistentes, estado_reserva)
     VALUES ('2025-12-02 09:00:00', '2025-12-02 10:00:00', ?, ?, 2, 'Activo')`,
    [ctx.ids.salaA, ctx.ids.anaId],
  );
  ctx.ids.anaReservaId = anaReserva.insertId;

  // 6. Cablear repositorios y aplicaciones REALES.
  const userRepository = createUserRepository({ pool: ctx.pool });
  const authApp = createAuthApp({ userRepository, jwtSecret: SECRET });

  const reservaRepository = createReservaRepository(ctx.pool);
  const availabilityRepository = createAvailabilityRepository(ctx.pool);
  const bookingApp = crearApp({
    reservaRepository,
    espacioRepository: availabilityRepository,
    jwtSecret: SECRET,
    ahora: () => AHORA,
  });

  const auth = await listen(authApp);
  const booking = await listen(bookingApp);
  ctx.authServer = auth.server;
  ctx.authBase = auth.base;
  ctx.bookingServer = booking.server;
  ctx.bookingBase = booking.base;
}

// --- Preparación del entorno con guardia de disponibilidad de BD ---
try {
  await setup();
  ctx.available = true;
} catch (err) {
  ctx.reason = err && err.message ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.warn(
    `[e2e] Suite de integración OMITIDA: no hay MySQL de prueba accesible. ` +
      `Detalle: ${ctx.reason}. ` +
      `Configura DB_TEST_HOST/DB_TEST_PORT/DB_TEST_USER/DB_TEST_PASSWORD para ejecutarla.`,
  );
}

const suite = ctx.available ? describe : describe.skip;

suite('Integración E2E booking-service (tarea 10.2)', () => {
  afterAll(async () => {
    if (ctx.bookingServer) await new Promise((r) => ctx.bookingServer.close(r));
    if (ctx.authServer) await new Promise((r) => ctx.authServer.close(r));
    if (ctx.pool) {
      try {
        await ctx.pool.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
      } catch {
        // best-effort cleanup
      }
      await ctx.pool.end();
    }
  });

  describe('flujo completo login → búsqueda → reserva → mis reservas → cancelación', () => {
    it('ejecuta el ciclo de vida de una Reserva contra MySQL real (R6.1, R7.1, R7.3)', async () => {
      // 1. LOGIN (auth-service) — COLABORADOR Carlos.
      const login = await request(ctx.authBase, 'POST', '/auth/login', {
        body: { usuario: 'carlos.mendez@corporativoalpha.com', password: 'User123' },
      });
      expect(login.status).toBe(200);
      expect(login.body.role).toBe('COLABORADOR');
      expect(typeof login.body.token).toBe('string');
      const token = login.body.token;

      // El sub del token debe ser el id real de Carlos.
      const decoded = jwt.verify(token, SECRET);
      expect(String(decoded.sub)).toBe(String(ctx.ids.carlosId));

      // 2. BÚSQUEDA de disponibilidad — la Sala Alfa debe aparecer.
      const search = await request(
        ctx.bookingBase,
        'GET',
        `/disponibilidad?fecha=2025-12-01&horaInicio=09:00&horaFin=10:00&tipo=${encodeURIComponent(
          'Sala de juntas',
        )}&capacidadMin=4`,
        { authToken: token },
      );
      expect(search.status).toBe(200);
      expect(Array.isArray(search.body.espacios)).toBe(true);
      const ids = search.body.espacios.map((e) => e.id_espacio);
      expect(ids).toContain(ctx.ids.salaA);

      // 3. RESERVA — creación válida asociada al solicitante (201).
      //    Se usa el formato del contrato (ISO-8601 con sufijo Z).
      const create = await request(ctx.bookingBase, 'POST', '/reservas', {
        authToken: token,
        body: {
          idEspacio: ctx.ids.salaA,
          fechaInicio: '2025-12-01T09:00:00Z',
          fechaFin: '2025-12-01T10:00:00Z',
          asistentes: 4,
        },
      });
      expect(create.status).toBe(201);
      expect(create.body.reserva.estado_reserva).toBe('Activo');
      expect(String(create.body.reserva.id_usuario)).toBe(String(ctx.ids.carlosId));
      const reservaId = create.body.reserva.id_reserva;

      // Persistencia real verificable en la BD.
      const [persisted] = await ctx.pool.query(
        'SELECT estado_reserva FROM reserva WHERE id_reserva = ?',
        [reservaId],
      );
      expect(persisted).toHaveLength(1);
      expect(persisted[0].estado_reserva).toBe('Activo');

      // 4. MIS RESERVAS — devuelve solo las de Carlos (no las de Ana).
      const mias = await request(ctx.bookingBase, 'GET', '/reservas/mias', {
        authToken: token,
      });
      expect(mias.status).toBe(200);
      const misIds = mias.body.reservas.map((r) => r.id_reserva);
      expect(misIds).toContain(reservaId);
      expect(misIds).not.toContain(ctx.ids.anaReservaId);
      for (const r of mias.body.reservas) {
        expect(String(r.id_usuario)).toBe(String(ctx.ids.carlosId));
      }

      // 5. CANCELACIÓN — Reserva propia y futura → 200 "Cancelado".
      const cancel = await request(ctx.bookingBase, 'DELETE', `/reservas/${reservaId}`, {
        authToken: token,
      });
      expect(cancel.status).toBe(200);
      expect(cancel.body.reserva.estado_reserva).toBe('Cancelado');
      expect(cancel.body.reserva.fecha_cancelacion).not.toBeNull();

      // Estado final persistido = "Cancelado".
      const [afterCancel] = await ctx.pool.query(
        'SELECT estado_reserva, fecha_cancelacion FROM reserva WHERE id_reserva = ?',
        [reservaId],
      );
      expect(afterCancel[0].estado_reserva).toBe('Cancelado');
      expect(afterCancel[0].fecha_cancelacion).not.toBeNull();
    });
  });

  describe('concurrencia: dos reservas simultáneas sobre el mismo Espacio/rango', () => {
    it('crea exactamente una (201) y rechaza la otra con 409 (R6.2, R14.3)', async () => {
      const login = await request(ctx.authBase, 'POST', '/auth/login', {
        body: { usuario: 'carlos.mendez@corporativoalpha.com', password: 'User123' },
      });
      const token = login.body.token;

      const reservaBody = {
        idEspacio: ctx.ids.salaB,
        fechaInicio: '2025-12-03T09:00:00Z',
        fechaFin: '2025-12-03T10:00:00Z',
        asistentes: 2,
      };

      // Disparar ambas solicitudes en paralelo sobre el mismo Espacio/rango.
      const [a, b] = await Promise.all([
        request(ctx.bookingBase, 'POST', '/reservas', { authToken: token, body: reservaBody }),
        request(ctx.bookingBase, 'POST', '/reservas', { authToken: token, body: reservaBody }),
      ]);

      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual([201, 409]);

      // En la BD debe existir exactamente UNA Reserva activa para ese rango.
      const [rows] = await ctx.pool.query(
        `SELECT COUNT(*) AS total FROM reserva
          WHERE id_espacio = ? AND estado_reserva = 'Activo'
            AND fecha_inicio = '2025-12-03 09:00:00'`,
        [ctx.ids.salaB],
      );
      expect(Number(rows[0].total)).toBe(1);
    });
  });

  describe('atomicidad real (rollback) ante fallo durante la escritura', () => {
    it('no persiste cambios parciales si la transacción falla (Property 20, R14.3)', async () => {
      // Token válido (firma correcta) pero con un sub que NO existe en `usuario`.
      // La verificación de solapamiento pasa y el INSERT falla por violación de
      // clave foránea, forzando ROLLBACK dentro del repositorio → 500.
      const badToken = jwt.sign({ sub: 99999999, role: 'COLABORADOR' }, SECRET, {
        algorithm: 'HS256',
        expiresIn: 3600,
      });

      const before = await ctx.pool.query(
        'SELECT COUNT(*) AS total FROM reserva WHERE id_espacio = ?',
        [ctx.ids.salaA],
      );
      const totalBefore = Number(before[0][0].total);

      const res = await request(ctx.bookingBase, 'POST', '/reservas', {
        authToken: badToken,
        body: {
          idEspacio: ctx.ids.salaA,
          fechaInicio: '2025-12-05T09:00:00Z',
          fechaFin: '2025-12-05T10:00:00Z',
          asistentes: 3,
        },
      });

      // Error no controlado durante la escritura → 500 (R14.8).
      expect(res.status).toBe(500);

      // Atomicidad: el número de Reservas del Espacio no cambió (sin parciales).
      const after = await ctx.pool.query(
        'SELECT COUNT(*) AS total FROM reserva WHERE id_espacio = ?',
        [ctx.ids.salaA],
      );
      expect(Number(after[0][0].total)).toBe(totalBefore);

      // En concreto, no quedó ninguna Reserva para el rango solicitado.
      const [orphan] = await ctx.pool.query(
        `SELECT COUNT(*) AS total FROM reserva
          WHERE id_espacio = ? AND fecha_inicio = '2025-12-05 09:00:00'`,
        [ctx.ids.salaA],
      );
      expect(Number(orphan[0].total)).toBe(0);
    });
  });

  describe('smoke de la documentación OpenAPI (R13.1)', () => {
    it('GET /api-docs.json devuelve una especificación OpenAPI 3.x válida', async () => {
      const res = await request(ctx.bookingBase, 'GET', '/api-docs.json');
      expect(res.status).toBe(200);
      expect(typeof res.body.openapi).toBe('string');
      expect(res.body.openapi.startsWith('3.')).toBe(true);
      expect(res.body.paths && typeof res.body.paths).toBe('object');
      expect(Object.keys(res.body.paths).length).toBeGreaterThan(0);
      // Los endpoints núcleo del servicio deben estar documentados.
      expect(res.body.paths['/reservas']).toBeTruthy();
      expect(res.body.paths['/disponibilidad']).toBeTruthy();
    });

    it('GET /api-docs sirve la UI de Swagger sin afectar al resto del servicio', async () => {
      const res = await fetch(ctx.bookingBase + '/api-docs/', { redirect: 'manual' });
      // Swagger UI responde 200 (HTML) o 301/302 hacia su índice.
      expect([200, 301, 302]).toContain(res.status);
    });
  });
});

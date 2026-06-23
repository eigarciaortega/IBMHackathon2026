import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import fc from 'fast-check';
import { crearApp } from './app.js';

/**
 * Feature: officespace-management, Property 14: Round-trip de catálogo y completitud del listado
 *
 * For any Espacio válido creado, el listado de Espacios SHALL incluirlo con
 * todos sus atributos (nombre/identificador, Tipo_Espacio, Capacidad, Recursos,
 * piso/ubicacion); tras una edición válida SHALL reflejar los nuevos valores; y
 * tras una eliminación SHALL dejar de incluirlo.
 *
 * Validates: Requirements 3.1, 3.4, 3.5, 3.6, 14.2
 *
 * Enfoque: se ejercita el ciclo HTTP completo (POST → GET → PUT → GET → DELETE
 * → GET) del catalog-service contra un repositorio en memoria (Map) que
 * implementa la misma interfaz que `espacioRepository`
 * (listarEspacios/crearEspacio/actualizarEspacio/eliminarEspacio/obtenerEspacioPorId),
 * de modo que las semánticas de round-trip se prueban sin MySQL. Las escrituras
 * exigen un Token_JWT de Rol ADMINISTRADOR (R3.1/R3.5/R3.6).
 */

const SECRET = 'test-secret-catalog-prop14';
const NUM_RUNS = 120; // mínimo requerido por diseño: 100

/** Firma un Token_JWT HS256 de ADMINISTRADOR. */
const ADMIN = () =>
  jwt.sign({ sub: 'admin-1', role: 'ADMINISTRADOR' }, SECRET, {
    algorithm: 'HS256',
    expiresIn: 3600,
  });

/** Catálogo normalizado de Recursos (id → nombre) usado por el repo en memoria. */
const RECURSO_CATALOG = Object.freeze([
  { id_recurso: 1, nombre: 'proyector' },
  { id_recurso: 2, nombre: 'aire acondicionado' },
  { id_recurso: 3, nombre: 'pizarra' },
  { id_recurso: 4, nombre: 'videoconferencia' },
  { id_recurso: 5, nombre: 'telefono' },
]);
const RECURSO_IDS = RECURSO_CATALOG.map((r) => r.id_recurso);
const RECURSO_BY_ID = new Map(RECURSO_CATALOG.map((r) => [r.id_recurso, r]));

/**
 * Resuelve una entrada de recursos (array de ids o de objetos {id_recurso}) a
 * `[{ id_recurso, nombre }]`, deduplicando y descartando ids desconocidos.
 * Reproduce la resolución del repositorio real vía la unión espacio_recurso.
 */
function resolveRecursos(recursos) {
  if (!Array.isArray(recursos)) return [];
  const seen = new Set();
  const out = [];
  for (const item of recursos) {
    const id = item && typeof item === 'object' ? item.id_recurso : item;
    const num = Number(id);
    if (Number.isInteger(num) && RECURSO_BY_ID.has(num) && !seen.has(num)) {
      seen.add(num);
      out.push({ ...RECURSO_BY_ID.get(num) });
    }
  }
  return out;
}

/** Ordena recursos por id_recurso para comparaciones independientes del orden. */
const sortRecursos = (arr) => [...arr].sort((a, b) => a.id_recurso - b.id_recurso);

const clone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Repositorio de Espacios en memoria respaldado por un Map. Implementa la misma
 * interfaz que `espacioRepository`, resolviendo Recursos contra RECURSO_CATALOG.
 */
function makeInMemoryRepo() {
  const map = new Map();
  let nextId = 1;

  function build(id, data, prev) {
    return {
      id_espacio: id,
      nombre: data.nombre,
      tipo: data.tipo,
      capacidad: Number(data.capacidad),
      piso: data.piso,
      ubicacion: data.ubicacion,
      activo: prev ? prev.activo : true,
      recursos:
        data.recursos !== undefined
          ? resolveRecursos(data.recursos)
          : prev
            ? prev.recursos
            : [],
    };
  }

  return {
    __reset() {
      map.clear();
      nextId = 1;
    },
    async listarEspacios() {
      return Array.from(map.values())
        .sort((a, b) => a.id_espacio - b.id_espacio)
        .map(clone);
    },
    async obtenerEspacioPorId(id) {
      const e = map.get(Number(id));
      return e ? clone(e) : null;
    },
    async crearEspacio(data) {
      const id = nextId++;
      const espacio = build(id, data, null);
      map.set(id, espacio);
      return clone(espacio);
    },
    async actualizarEspacio(id, data) {
      const key = Number(id);
      const prev = map.get(key);
      if (!prev) return null;
      const espacio = build(key, data, prev);
      map.set(key, espacio);
      return clone(espacio);
    },
    async eliminarEspacio(id) {
      const key = Number(id);
      if (!map.has(key)) return false;
      map.delete(key);
      return true;
    },
  };
}

// --- Generadores de Espacios válidos (R3.1) ---
const validNombre = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length >= 1);
const validTipo = fc.constantFrom('Sala de juntas', 'Escritorio individual');
const validCapacidad = fc.integer({ min: 1, max: 1000 });
const validPiso = fc.integer({ min: -5, max: 200 });
const validUbicacion = fc
  .string({ minLength: 1, maxLength: 60 })
  .filter((s) => s.trim().length >= 1);
const validRecursos = fc.uniqueArray(fc.constantFrom(...RECURSO_IDS), {
  minLength: 0,
  maxLength: RECURSO_IDS.length,
});

const validEspacioArb = fc.record({
  nombre: validNombre,
  tipo: validTipo,
  capacidad: validCapacidad,
  piso: validPiso,
  ubicacion: validUbicacion,
  recursos: validRecursos,
});

// --- Servidor HTTP (un único arranque, repo reseteable por iteración) ---
let repo;
let server;
let base;

beforeAll(async () => {
  repo = makeInMemoryRepo();
  const app = crearApp({ repository: repo, jwtSecret: SECRET });
  server = app.listen(0);
  await new Promise((resolve) => server.on('listening', resolve));
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

/** Petición HTTP normalizada a { status, body }. */
async function request(method, path, { body, authToken } = {}) {
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

/** Aserta que un Espacio del listado coincide con los atributos esperados. */
function expectMatchesEspacio(actual, esperado) {
  expect(actual).toBeDefined();
  expect(actual.nombre).toBe(esperado.nombre);
  expect(actual.tipo).toBe(esperado.tipo);
  expect(actual.capacidad).toBe(Number(esperado.capacidad));
  expect(actual.piso).toBe(esperado.piso);
  expect(actual.ubicacion).toBe(esperado.ubicacion);
  expect(sortRecursos(actual.recursos)).toEqual(sortRecursos(resolveRecursos(esperado.recursos)));
}

describe('Property 14: Round-trip de catálogo y completitud del listado (PBT)', () => {
  it('crear → listado lo incluye con todos sus atributos; editar → refleja nuevos valores; eliminar → desaparece (R3.1, R3.4, R3.5, R3.6, R14.2)', async () => {
    await fc.assert(
      fc.asyncProperty(validEspacioArb, validEspacioArb, async (original, editado) => {
        repo.__reset();

        // --- Crear (R3.1, R14.2) ---
        const creado = await request('POST', '/espacios', {
          body: original,
          authToken: ADMIN(),
        });
        expect(creado.status).toBe(201);
        const id = creado.body.espacio.id_espacio;
        expect(id).toBeDefined();

        // --- El listado lo incluye con todos sus atributos (R3.4) ---
        let lista = await request('GET', '/espacios', { authToken: ADMIN() });
        expect(lista.status).toBe(200);
        let encontrado = lista.body.espacios.find((e) => e.id_espacio === id);
        expectMatchesEspacio(encontrado, original);

        // --- Editar con nuevos valores válidos (R3.5) ---
        const actualizado = await request('PUT', `/espacios/${id}`, {
          body: editado,
          authToken: ADMIN(),
        });
        expect(actualizado.status).toBe(200);

        // --- El listado refleja los nuevos valores (R3.4, R3.5) ---
        lista = await request('GET', '/espacios', { authToken: ADMIN() });
        expect(lista.status).toBe(200);
        encontrado = lista.body.espacios.find((e) => e.id_espacio === id);
        expectMatchesEspacio(encontrado, editado);

        // --- Eliminar (R3.6) ---
        const eliminado = await request('DELETE', `/espacios/${id}`, {
          authToken: ADMIN(),
        });
        expect(eliminado.status).toBe(200);

        // --- Tras eliminar deja de incluirlo (R3.6) ---
        lista = await request('GET', '/espacios', { authToken: ADMIN() });
        expect(lista.status).toBe(200);
        expect(lista.body.espacios.find((e) => e.id_espacio === id)).toBeUndefined();
      }),
      { numRuns: NUM_RUNS },
    );
  }, 60000);
});

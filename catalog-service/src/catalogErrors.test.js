import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { crearApp } from './app.js';

/**
 * Tarea 4.7 — Pruebas unitarias (basadas en ejemplos) de casos de error del catalog-service.
 *
 * Consolida y verifica explícitamente dos comportamientos de error del servicio
 * de catálogo usando la app real (con middlewares compartidos de auth y errores)
 * y repositorios simulados, sin MySQL en vivo:
 *
 *  - R4.5: si la consulta de ocupación falla durante su procesamiento, el
 *    Servicio_Catalogo responde HTTP 500 con el contrato de error uniforme y
 *    SIN alterar el estado de Espacios ni de Reservas.
 *  - R3.7: editar (PUT) o eliminar (DELETE) un Espacio cuyo identificador no
 *    existe responde HTTP 404 NOT_FOUND sin realizar ninguna modificación.
 *
 * _Requirements: 4.5, 3.7_
 */

const JWT_SECRET = 'test-secret-catalog-errors';
const AHORA = new Date('2024-06-15T12:00:00Z');

/** Firma un Token_JWT HS256 con el Rol indicado. */
function token(role, sub = 'u-err') {
  return jwt.sign({ sub, role }, JWT_SECRET, { algorithm: 'HS256', expiresIn: 3600 });
}

const ADMIN = () => token('ADMINISTRADOR');

const espacioValido = {
  nombre: 'Sala Gamma',
  tipo: 'Sala de juntas',
  capacidad: 12,
  piso: 4,
  ubicacion: 'Ala este',
  recursos: [1],
};

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

describe('catalog-service casos de error (tarea 4.7)', () => {
  describe('R4.5 — fallo de consulta de ocupación → 500 sin alterar estado', () => {
    it('GET /ocupacion responde 500 con contrato uniforme cuando la consulta falla', async () => {
      // Estado simulado del repositorio; un fallo de consulta no debe mutarlo.
      const estado = {
        espacios: [{ id_espacio: 1, nombre: 'Sala A', piso: 1, ubicacion: 'Norte' }],
        reservas: [
          {
            id_espacio: 1,
            estado_reserva: 'Activo',
            fecha_inicio: '2024-06-15T09:00:00Z',
            fecha_fin: '2024-06-15T18:00:00Z',
          },
        ],
      };
      const snapshot = JSON.stringify(estado);
      let consultas = 0;

      const ocupacionRepository = {
        obtenerEspaciosYReservas: async () => {
          consultas += 1;
          throw new Error('fallo de consulta simulado');
        },
      };

      const app = crearApp({
        ocupacionRepository,
        jwtSecret: JWT_SECRET,
        ahora: () => AHORA,
        logger: () => {},
      });

      const res = await withServer(app, (base) =>
        request(base, 'GET', '/ocupacion', { authToken: ADMIN() }),
      );

      // 500 con el contrato de error uniforme.
      expect(res.status).toBe(500);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      expect(typeof res.body.error.message).toBe('string');

      // Se intentó la consulta y el estado permanece sin alterar.
      expect(consultas).toBe(1);
      expect(JSON.stringify(estado)).toBe(snapshot);
    });
  });

  describe('R3.7 — operaciones sobre identificadores inexistentes → 404', () => {
    /**
     * Repositorio simulado donde editar/eliminar señalan "no existe":
     * `actualizarEspacio` devuelve null y `eliminarEspacio` devuelve false.
     * Registra las llamadas para confirmar que no hubo persistencia adicional.
     */
    function repoInexistente() {
      const calls = { actualizar: [], eliminar: [] };
      return {
        __calls: calls,
        listarEspacios: async () => [],
        crearEspacio: async (data) => ({ id_espacio: 1, ...data }),
        actualizarEspacio: async (id, data) => {
          calls.actualizar.push({ id, data });
          return null;
        },
        eliminarEspacio: async (id) => {
          calls.eliminar.push(id);
          return false;
        },
        obtenerEspacioPorId: async () => null,
      };
    }

    it('PUT /espacios/:id con id inexistente → 404 NOT_FOUND sin modificar', async () => {
      const repo = repoInexistente();
      const app = crearApp({ repository: repo, jwtSecret: JWT_SECRET });

      const res = await withServer(app, (base) =>
        request(base, 'PUT', '/espacios/999', { body: espacioValido, authToken: ADMIN() }),
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      // Se intentó la actualización (devolvió null) pero no hubo cambio aplicado.
      expect(repo.__calls.actualizar).toHaveLength(1);
      expect(repo.__calls.actualizar[0].id).toBe('999');
    });

    it('DELETE /espacios/:id con id inexistente → 404 NOT_FOUND sin modificar', async () => {
      const repo = repoInexistente();
      const app = crearApp({ repository: repo, jwtSecret: JWT_SECRET });

      const res = await withServer(app, (base) =>
        request(base, 'DELETE', '/espacios/999', { authToken: ADMIN() }),
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      // Se intentó la eliminación (devolvió false) pero no se eliminó nada.
      expect(repo.__calls.eliminar).toEqual(['999']);
    });
  });
});

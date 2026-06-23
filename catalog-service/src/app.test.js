import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { crearApp } from './app.js';

const SECRET = 'test-secret-catalog';

/** Firma un Token_JWT HS256 con el Rol indicado. */
function token(role, sub = 'u-1') {
  return jwt.sign({ sub, role }, SECRET, { algorithm: 'HS256', expiresIn: 3600 });
}

const ADMIN = () => token('ADMINISTRADOR');
const COLAB = () => token('COLABORADOR');

const espacioValido = {
  nombre: 'Sala Alfa',
  tipo: 'Sala de juntas',
  capacidad: 10,
  piso: 2,
  ubicacion: 'Ala norte',
  recursos: [1, 2],
};

/**
 * Construye un repositorio simulado. Cada método registra sus llamadas para
 * permitir aserciones de "no se persistió" en los casos 401/403/400/404.
 */
function makeRepo(overrides = {}) {
  const calls = { crear: [], actualizar: [], eliminar: [], listar: 0 };
  const repo = {
    listarEspacios: async () => {
      calls.listar += 1;
      return [];
    },
    crearEspacio: async (data) => {
      calls.crear.push(data);
      return { id_espacio: 1, activo: true, recursos: [], ...data };
    },
    actualizarEspacio: async (id, data) => {
      calls.actualizar.push({ id, data });
      return { id_espacio: Number(id), activo: true, recursos: [], ...data };
    },
    eliminarEspacio: async (id) => {
      calls.eliminar.push(id);
      return true;
    },
    obtenerEspacioPorId: async () => null,
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

describe('catalog-service /espacios endpoints (R3, R14)', () => {
  let repo;
  let app;

  beforeEach(() => {
    repo = makeRepo();
    app = crearApp({ repository: repo, jwtSecret: SECRET });
  });

  describe('autenticación requerida (R2.1, R14.5)', () => {
    it('GET /espacios sin token → 401', async () => {
      const res = await withServer(app, (base) => request(base, 'GET', '/espacios'));
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('POST /espacios sin token → 401 sin persistir', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'POST', '/espacios', { body: espacioValido }),
      );
      expect(res.status).toBe(401);
      expect(repo.__calls.crear).toHaveLength(0);
    });
  });

  describe('autorización por Rol (R2.2, R2.3, R14.6)', () => {
    it('POST /espacios con COLABORADOR → 403 sin persistir', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'POST', '/espacios', { body: espacioValido, authToken: COLAB() }),
      );
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
      expect(repo.__calls.crear).toHaveLength(0);
    });

    it('PUT /espacios/:id con COLABORADOR → 403 sin persistir', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'PUT', '/espacios/1', { body: espacioValido, authToken: COLAB() }),
      );
      expect(res.status).toBe(403);
      expect(repo.__calls.actualizar).toHaveLength(0);
    });

    it('DELETE /espacios/:id con COLABORADOR → 403 sin persistir', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'DELETE', '/espacios/1', { authToken: COLAB() }),
      );
      expect(res.status).toBe(403);
      expect(repo.__calls.eliminar).toHaveLength(0);
    });

    it('GET /espacios con COLABORADOR autenticado → 200', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'GET', '/espacios', { authToken: COLAB() }),
      );
      expect(res.status).toBe(200);
    });
  });

  describe('POST /espacios (R3.1, R3.2, R3.3, R14.1)', () => {
    it('ADMINISTRADOR con cuerpo válido → 201 con el Espacio creado', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'POST', '/espacios', { body: espacioValido, authToken: ADMIN() }),
      );
      expect(res.status).toBe(201);
      expect(res.body.espacio).toMatchObject({
        nombre: 'Sala Alfa',
        tipo: 'Sala de juntas',
        capacidad: 10,
        piso: 2,
        ubicacion: 'Ala norte',
      });
      expect(repo.__calls.crear).toHaveLength(1);
    });

    it('cuerpo inválido (campos faltantes) → 400 con lista de campos, sin persistir', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'POST', '/espacios', { body: { nombre: 'x' }, authToken: ADMIN() }),
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields).toEqual(
        expect.arrayContaining(['tipo', 'capacidad', 'piso', 'ubicacion']),
      );
      expect(repo.__calls.crear).toHaveLength(0);
    });

    it('Tipo_Espacio fuera del enum → 400 sin persistir', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'POST', '/espacios', {
          body: { ...espacioValido, tipo: 'Auditorio' },
          authToken: ADMIN(),
        }),
      );
      expect(res.status).toBe(400);
      expect(res.body.error.fields).toContain('tipo');
      expect(repo.__calls.crear).toHaveLength(0);
    });
  });

  describe('GET /espacios resuelve Recursos vía espacio_recurso (R3.4)', () => {
    it('devuelve atributos completos incluyendo piso, ubicacion y recursos', async () => {
      const espaciosMock = [
        {
          id_espacio: 7,
          nombre: 'Sala Beta',
          tipo: 'Sala de juntas',
          capacidad: 20,
          piso: 3,
          ubicacion: 'Ala sur',
          activo: true,
          recursos: [
            { id_recurso: 1, nombre: 'proyector' },
            { id_recurso: 2, nombre: 'aire acondicionado' },
          ],
        },
      ];
      repo = makeRepo({ listarEspacios: async () => espaciosMock });
      app = crearApp({ repository: repo, jwtSecret: SECRET });

      const res = await withServer(app, (base) =>
        request(base, 'GET', '/espacios', { authToken: ADMIN() }),
      );

      expect(res.status).toBe(200);
      expect(res.body.espacios).toHaveLength(1);
      const espacio = res.body.espacios[0];
      expect(espacio).toMatchObject({ piso: 3, ubicacion: 'Ala sur' });
      expect(espacio.recursos).toEqual([
        { id_recurso: 1, nombre: 'proyector' },
        { id_recurso: 2, nombre: 'aire acondicionado' },
      ]);
    });
  });

  describe('PUT /espacios/:id (R3.5, R3.7)', () => {
    it('ADMINISTRADOR actualiza Espacio existente → 200', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'PUT', '/espacios/5', {
          body: { ...espacioValido, nombre: 'Sala Renombrada' },
          authToken: ADMIN(),
        }),
      );
      expect(res.status).toBe(200);
      expect(res.body.espacio.nombre).toBe('Sala Renombrada');
      expect(repo.__calls.actualizar).toHaveLength(1);
    });

    it('id inexistente → 404 sin modificar', async () => {
      repo = makeRepo({ actualizarEspacio: async () => null });
      app = crearApp({ repository: repo, jwtSecret: SECRET });
      const res = await withServer(app, (base) =>
        request(base, 'PUT', '/espacios/999', { body: espacioValido, authToken: ADMIN() }),
      );
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('cuerpo inválido → 400 sin persistir', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'PUT', '/espacios/5', {
          body: { ...espacioValido, capacidad: 0 },
          authToken: ADMIN(),
        }),
      );
      expect(res.status).toBe(400);
      expect(res.body.error.fields).toContain('capacidad');
      expect(repo.__calls.actualizar).toHaveLength(0);
    });
  });

  describe('DELETE /espacios/:id (R3.6, R3.7)', () => {
    it('ADMINISTRADOR elimina Espacio existente → 200', async () => {
      const res = await withServer(app, (base) =>
        request(base, 'DELETE', '/espacios/5', { authToken: ADMIN() }),
      );
      expect(res.status).toBe(200);
      expect(repo.__calls.eliminar).toEqual(['5']);
    });

    it('id inexistente → 404', async () => {
      repo = makeRepo({ eliminarEspacio: async () => false });
      app = crearApp({ repository: repo, jwtSecret: SECRET });
      const res = await withServer(app, (base) =>
        request(base, 'DELETE', '/espacios/999', { authToken: ADMIN() }),
      );
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});

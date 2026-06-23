'use strict';

/**
 * app — factoría de la aplicación Express del catalog-service.
 *
 * Construye la app con el repositorio de Espacios inyectado, de modo que las
 * pruebas pueden importar la app y simular la capa de datos sin abrir un puerto
 * ni conectar a MySQL. `index.js` cablea el pool/repositorio reales y arranca el
 * servidor.
 *
 * Endpoints de Espacios (tarea 4.4):
 *   - POST   /espacios       (ADMINISTRADOR) → 201 | 400
 *   - GET    /espacios       (autenticado)   → 200 (atributos completos + Recursos)
 *   - PUT    /espacios/:id   (ADMINISTRADOR) → 200 | 400 | 404
 *   - DELETE /espacios/:id   (ADMINISTRADOR) → 200 | 404
 *
 * Autenticación/autorización (R2):
 *   - Todas las rutas exigen un Token_JWT válido (401 si ausente/expirado/inválido).
 *   - Las escrituras (POST/PUT/DELETE) exigen Rol ADMINISTRADOR (403 si COLABORADOR).
 *   - GET /espacios admite cualquier Usuario autenticado.
 *
 * Manejo de errores: contrato uniforme `{ error: { code, message, fields } }` vía
 * los middlewares compartidos (JSON malformado → 400; no controlado → 500).
 */

const express = require('express');
const cors = require('cors');

const { validarEspacio } = require('./espacioValidator');
const { crearOcupacionRouter } = require('./ocupacionRoutes');
const { mountCatalogApiDocs } = require('./openapi');
const { authMiddleware, requireRole } = require('../../shared/authMiddleware');
const {
  jsonParseErrorHandler,
  globalErrorHandler,
  validationError,
  notFoundError,
} = require('../../shared/errors');

/**
 * Envuelve un handler async para enrutar sus rechazos al middleware de errores.
 * @param {(req: object, res: object, next: Function) => Promise<any>} fn
 * @returns {(req: object, res: object, next: Function) => void}
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Crea la aplicación Express del catalog-service.
 *
 * @param {object} options
 * @param {object} [options.repository] - Repositorio de Espacios (tarea 4.4; ver espacioRepository).
 * @param {object} [options.ocupacionRepository] - Repositorio del Tablero_Ocupacion (tarea 4.6).
 * @param {string} [options.jwtSecret] - Secreto de firma JWT; por defecto `process.env.JWT_SECRET`.
 * @param {() => Date} [options.ahora] - Proveedor de "ahora" inyectable (Tablero_Ocupacion).
 * @param {(err: any) => void} [options.logger] - Hook opcional de logging de errores 500.
 * @returns {import('express').Express}
 */
function crearApp(options = {}) {
  const { repository, ocupacionRepository, jwtSecret, ahora, logger } = options;

  const app = express();
  app.use(cors());
  app.use(express.json());
  // Traduce JSON malformado a 400 con el contrato uniforme (R14.4).
  app.use(jsonParseErrorHandler());

  const authenticate = authMiddleware({ secret: jwtSecret });
  const adminOnly = requireRole('ADMINISTRADOR');

  // Health check para orquestación / verificación de arranque.
  app.get('/health', (req, res) => {
    res.status(200).json({ service: 'catalog-service', status: 'ok' });
  });

  // --- Endpoints de Espacios (tarea 4.4) ---
  // Se montan solo si se inyecta el repositorio de Espacios, para no acoplar la
  // construcción de la app a esta dependencia (el Tablero_Ocupacion de la tarea
  // 4.6 comparte esta misma factoría con su propio repositorio).
  if (repository) {
    // GET /espacios — cualquier Usuario autenticado (R3.4).
    app.get(
      '/espacios',
      authenticate,
      asyncHandler(async (req, res) => {
        const espacios = await repository.listarEspacios();
        res.status(200).json({ espacios });
      }),
    );

    // GET /recursos — catálogo de Recursos para checklists/filtros (cualquier
    // Usuario autenticado). Lo usan la Vista de administración (al crear/editar
    // un Espacio) y el Panel de búsqueda del COLABORADOR (filtro por recursos).
    app.get(
      '/recursos',
      authenticate,
      asyncHandler(async (req, res) => {
        const recursos = await repository.listarRecursos();
        res.status(200).json({ recursos: Array.isArray(recursos) ? recursos : [] });
      }),
    );

    // POST /espacios — ADMINISTRADOR (R3.1, R3.2, R3.3, R14.1).
    app.post(
      '/espacios',
      authenticate,
      adminOnly,
      asyncHandler(async (req, res) => {
        const validacion = validarEspacio(req.body);
        if (!validacion.valido) {
          throw validationError('Datos de Espacio inválidos', validacion.fields);
        }
        const espacio = await repository.crearEspacio(req.body);
        res.status(201).json({ espacio });
      }),
    );

    // PUT /espacios/:id — ADMINISTRADOR (R3.5, R3.2, R3.3, R3.7, R14.2).
    app.put(
      '/espacios/:id',
      authenticate,
      adminOnly,
      asyncHandler(async (req, res) => {
        const validacion = validarEspacio(req.body);
        if (!validacion.valido) {
          throw validationError('Datos de Espacio inválidos', validacion.fields);
        }
        const espacio = await repository.actualizarEspacio(req.params.id, req.body);
        if (!espacio) {
          throw notFoundError('Espacio no encontrado');
        }
        res.status(200).json({ espacio });
      }),
    );

    // DELETE /espacios/:id — ADMINISTRADOR (R3.6, R3.7, R14.2).
    app.delete(
      '/espacios/:id',
      authenticate,
      adminOnly,
      asyncHandler(async (req, res) => {
        const eliminado = await repository.eliminarEspacio(req.params.id);
        if (!eliminado) {
          throw notFoundError('Espacio no encontrado');
        }
        res.status(200).json({ id: req.params.id, eliminado: true });
      }),
    );
  }

  // GET /ocupacion — Tablero_Ocupacion, vista ADMINISTRADOR (tarea 4.6, R4.1-R4.5).
  // Se monta solo si se inyecta el repositorio de ocupación.
  if (ocupacionRepository) {
    app.use(crearOcupacionRouter({ repository: ocupacionRepository, secret: jwtSecret, ahora }));
  }

  // --- Documentación OpenAPI/Swagger en /api-docs (R13.1-R13.5) ---
  // Montaje aislado: si la carga de la spec falla, /api-docs responde 503 sin
  // afectar al resto de endpoints.
  mountCatalogApiDocs(app, { logger });

  // Middleware global de captura de excepciones (último del stack, R14.8).
  app.use(globalErrorHandler({ logger }));

  return app;
}

module.exports = { crearApp };

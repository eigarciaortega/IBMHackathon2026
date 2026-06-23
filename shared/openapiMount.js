'use strict';

/**
 * openapiMount.js — montaje aislado de la documentación OpenAPI/Swagger.
 *
 * El objetivo de este módulo (R13.1, R13.5) es montar la ruta `/api-docs` de
 * forma AISLADA del resto del router: si la construcción o carga de la
 * especificación falla, `/api-docs` responde con un indicador de error (503)
 * sin afectar la disponibilidad del resto de los endpoints del servicio.
 *
 * El módulo es framework-light: recibe la instancia de `swagger-ui-express` por
 * inyección para que la resolución de la dependencia ocurra en el `node_modules`
 * del servicio que monta la documentación (y no en el de `shared/`).
 */

/**
 * Construye el handler de fallback que indica documentación indisponible.
 * Sigue el contrato de error uniforme `{ error: { code, message } }`.
 *
 * @param {Error} error - Causa del fallo (no se expone al cliente).
 * @returns {(req: object, res: object) => void}
 */
function buildFallbackHandler(error) {
  return function docsUnavailable(req, res) {
    res.status(503).json({
      error: {
        code: 'DOCS_UNAVAILABLE',
        message: 'La documentación de la API no está disponible',
      },
    });
  };
}

/**
 * Valida que el objeto recibido tenga la forma mínima de una especificación
 * OpenAPI 3.0 con al menos un endpoint documentado.
 *
 * @param {any} spec
 * @returns {boolean}
 */
function isValidOpenApiSpec(spec) {
  return (
    !!spec &&
    typeof spec === 'object' &&
    typeof spec.openapi === 'string' &&
    spec.openapi.startsWith('3.') &&
    !!spec.paths &&
    typeof spec.paths === 'object' &&
    Object.keys(spec.paths).length > 0
  );
}

/**
 * Monta la documentación OpenAPI en `/api-docs` (y la especificación JSON en
 * `/api-docs.json`) de forma aislada.
 *
 * Estrategia de aislamiento (R13.5):
 *   1. La construcción de la especificación se ejecuta en un `try/catch`.
 *   2. Ante cualquier fallo (build inválido, error de `swagger-ui-express`), se
 *      registra `/api-docs` con un handler de fallback que responde 503.
 *   3. El resto de rutas del servicio nunca se ven afectadas, porque el montaje
 *      no propaga la excepción hacia el `app` factory.
 *
 * @param {import('express').Express|import('express').Router} app
 * @param {Object} options
 * @param {object} options.swaggerUi - Instancia de `swagger-ui-express`.
 * @param {() => object} options.buildSpec - Factoría que construye la spec OpenAPI.
 * @param {string} [options.basePath='/api-docs'] - Ruta base de la documentación.
 * @param {(err: any) => void} [options.logger] - Hook opcional de logging.
 * @returns {{ mounted: boolean, error?: Error, spec?: object }}
 */
function mountApiDocs(app, options = {}) {
  const { swaggerUi, buildSpec, logger } = options;
  const basePath =
    typeof options.basePath === 'string' && options.basePath.length > 0
      ? options.basePath
      : '/api-docs';

  let spec;
  try {
    if (typeof buildSpec !== 'function') {
      throw new Error('mountApiDocs requiere una función buildSpec');
    }
    if (!swaggerUi || typeof swaggerUi.setup !== 'function') {
      throw new Error('mountApiDocs requiere la instancia de swagger-ui-express');
    }
    spec = buildSpec();
    if (!isValidOpenApiSpec(spec)) {
      throw new Error('La especificación OpenAPI generada no es válida');
    }
  } catch (err) {
    if (typeof logger === 'function') logger(err);
    // Aislamiento: indicador de error en /api-docs sin afectar otros endpoints.
    app.use(basePath, buildFallbackHandler(err));
    return { mounted: false, error: err };
  }

  try {
    // Especificación cruda en JSON para consumo programático (R13.1).
    app.get(`${basePath}.json`, (req, res) => {
      res.status(200).json(spec);
    });
    // Swagger UI navegable.
    app.use(basePath, swaggerUi.serve, swaggerUi.setup(spec));
  } catch (err) {
    if (typeof logger === 'function') logger(err);
    app.use(basePath, buildFallbackHandler(err));
    return { mounted: false, error: err };
  }

  return { mounted: true, spec };
}

module.exports = {
  mountApiDocs,
  isValidOpenApiSpec,
  buildFallbackHandler,
};

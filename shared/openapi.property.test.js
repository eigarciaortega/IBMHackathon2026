import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildSpec as buildAuthSpec } from '../auth-service/src/openapi.js';
import { buildSpec as buildCatalogSpec } from '../catalog-service/src/openapi.js';
import { buildSpec as buildBookingSpec } from '../booking-service/src/openapi.js';
import { createAuthApp } from '../auth-service/src/app.js';
import { crearApp as crearCatalogApp } from '../catalog-service/src/app.js';
import { crearApp as crearBookingApp } from '../booking-service/src/app.js';

/**
 * Feature: officespace-management, Property 22: Completitud de la especificación OpenAPI
 *
 * Validates: Requirements 13.2, 13.3, 13.4
 *
 * For any endpoint registrado y expuesto por el sistema, la especificación
 * Swagger/OpenAPI servida en `/api-docs` SHALL documentarlo incluyendo al menos
 * un ejemplo de solicitud, al menos un ejemplo de respuesta, los códigos de
 * estado HTTP aplicables y los esquemas de datos de entrada y salida.
 *
 * Estrategia: se construyen las tres aplicaciones Express (auth, catalog,
 * booking) con repositorios simulados de modo que TODAS sus rutas de negocio
 * queden montadas. Se extraen las rutas realmente REGISTRADAS de cada router de
 * Express (excluyendo la infraestructura `/health` y `/api-docs`) y, con
 * `fast-check`, se muestrea aleatoriamente una ruta registrada del conjunto en
 * cada iteración (≥100 corridas). Para cada ruta registrada se verifica que la
 * spec del servicio correspondiente la documenta y cumple los cuatro requisitos
 * de completitud (ejemplo de solicitud, ejemplo de respuesta, códigos HTTP y
 * esquemas de entrada/salida). Así la propiedad comprueba la dirección esencial
 * de R13.2: «toda ruta registrada está documentada», y no solo que las
 * operaciones ya presentes en la spec estén bien formadas.
 */

const SECRET = 'test-secret-openapi-property';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'options', 'head']);

/** Repositorios simulados: solo deben permitir el MONTAJE de todas las rutas. */
const authRepoStub = {
  findByEmail: async () => null,
  updateLoginState: async () => {},
};

const catalogRepoStub = {
  listarEspacios: async () => [],
  crearEspacio: async () => ({}),
  actualizarEspacio: async () => null,
  eliminarEspacio: async () => false,
};

const ocupacionRepoStub = {
  obtenerEspaciosYReservas: async () => ({ espacios: [], reservas: [] }),
};

const reservaRepoStub = {
  obtenerEspacioPorId: async () => null,
  crearReservaConVerificacion: async () => ({}),
  listarReservasDeUsuario: async () => [],
  obtenerReservaPorId: async () => null,
  cancelarReserva: async () => null,
};

const espacioRepoStub = {
  obtenerEspaciosYReservasParaRango: async () => ({ espacios: [], reservas: [] }),
};

/**
 * Servicios bajo prueba: la spec documentada y la app real con todas sus rutas
 * de negocio montadas mediante repositorios simulados.
 */
const SERVICES = [
  {
    service: 'auth-service',
    buildSpec: buildAuthSpec,
    app: createAuthApp({ userRepository: authRepoStub, jwtSecret: SECRET }),
  },
  {
    service: 'catalog-service',
    buildSpec: buildCatalogSpec,
    app: crearCatalogApp({
      repository: catalogRepoStub,
      ocupacionRepository: ocupacionRepoStub,
      jwtSecret: SECRET,
    }),
  },
  {
    service: 'booking-service',
    buildSpec: buildBookingSpec,
    app: crearBookingApp({
      reservaRepository: reservaRepoStub,
      espacioRepository: espacioRepoStub,
      jwtSecret: SECRET,
    }),
  },
];

/** Convierte un path de Express (`/reservas/:id`) al formato OpenAPI (`/reservas/{id}`). */
function expressToOpenApiPath(p) {
  return p.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

/** ¿Es una ruta de infraestructura (no documentada en la spec de negocio)? */
function isInfraPath(rawPath) {
  return rawPath === '/health' || rawPath.startsWith('/api-docs');
}

/**
 * Extrae las rutas REGISTRADAS de una app Express, recorriendo recursivamente el
 * stack del router (incluidos los routers montados con `app.use`).
 *
 * @param {import('express').Express} app
 * @param {string} service
 * @returns {Array<{ service: string, method: string, path: string, label: string }>}
 */
function extractRegisteredRoutes(app, service) {
  const routes = [];
  const rootStack = (app._router && app._router.stack) || [];

  const visit = (layers) => {
    for (const layer of layers) {
      if (layer.route && typeof layer.route.path === 'string') {
        const rawPath = layer.route.path;
        if (isInfraPath(rawPath)) continue;
        const path = expressToOpenApiPath(rawPath);
        const methods = Object.keys(layer.route.methods || {}).filter((m) =>
          HTTP_METHODS.has(m.toLowerCase()),
        );
        for (const method of methods) {
          routes.push({
            service,
            method: method.toLowerCase(),
            path,
            label: `[${service}] ${method.toUpperCase()} ${path}`,
          });
        }
      } else if (layer.name === 'router' && layer.handle && Array.isArray(layer.handle.stack)) {
        visit(layer.handle.stack);
      }
    }
  };

  visit(rootStack);
  return routes;
}

/** Indica si alguna respuesta de la operación expone un ejemplo en JSON (R13.3). */
function hasResponseExample(op) {
  return Object.values(op.responses || {}).some(
    (r) => r?.content?.['application/json']?.example !== undefined,
  );
}

/** Indica si alguna respuesta de la operación expone un esquema de salida en JSON (R13.4). */
function hasResponseSchema(op) {
  return Object.values(op.responses || {}).some(
    (r) => r?.content?.['application/json']?.schema !== undefined,
  );
}

/**
 * Indica si la operación expone al menos un ejemplo de solicitud (R13.3):
 *   - un ejemplo en el `requestBody` (endpoints con cuerpo), o
 *   - al menos un parámetro con `example` (endpoints de query/path/header).
 */
function hasRequestExample(op) {
  const bodyExample = op.requestBody?.content?.['application/json']?.example !== undefined;
  const paramExample =
    Array.isArray(op.parameters) && op.parameters.some((p) => p?.example !== undefined);
  return bodyExample || paramExample;
}

/** Indica si la operación expone el esquema de datos de entrada (R13.4). */
function hasInputSchema(op) {
  // Si hay requestBody, debe declarar un esquema de entrada.
  if (op.requestBody) {
    return op.requestBody?.content?.['application/json']?.schema !== undefined;
  }
  // Endpoints sin cuerpo definen su entrada vía parámetros tipados.
  return Array.isArray(op.parameters) && op.parameters.every((p) => p?.schema !== undefined);
}

/** Localiza la operación documentada para una ruta registrada. */
function findDocumentedOperation(spec, route) {
  const methods = spec.paths?.[route.path];
  return methods ? methods[route.method] : undefined;
}

describe('Feature: officespace-management, Property 22: Completitud de la especificación OpenAPI', () => {
  // Pre-construye specs y enumera todas las rutas registradas por servicio.
  const registeredRoutes = SERVICES.flatMap(({ service, buildSpec, app }) => {
    const spec = buildSpec();
    return extractRegisteredRoutes(app, service).map((route) => ({ ...route, spec }));
  });

  it('cada servicio expone al menos una ruta de negocio registrada', () => {
    // Sanity: si no hubiera rutas registradas, la propiedad sería vacuamente verdadera.
    expect(registeredRoutes.length).toBeGreaterThan(0);
    for (const svc of SERVICES) {
      const count = extractRegisteredRoutes(svc.app, svc.service).length;
      expect(count, `${svc.service} sin rutas de negocio registradas`).toBeGreaterThan(0);
    }
  });

  it('toda ruta registrada está documentada con ejemplos, códigos HTTP y esquemas de E/S', () => {
    fc.assert(
      fc.property(fc.constantFrom(...registeredRoutes), (route) => {
        const op = findDocumentedOperation(route.spec, route);

        // (R13.2) La ruta registrada DEBE estar documentada en la spec.
        expect(op, `${route.label}: ruta registrada no documentada en /api-docs`).toBeDefined();

        // (R13.4) Códigos de estado HTTP aplicables.
        const codes = Object.keys(op.responses || {});
        expect(codes.length, `${route.label}: debe declarar códigos HTTP`).toBeGreaterThan(0);

        // (R13.3) Al menos un ejemplo de solicitud.
        expect(hasRequestExample(op), `${route.label}: falta ejemplo de solicitud`).toBe(true);

        // (R13.3) Al menos un ejemplo de respuesta.
        expect(hasResponseExample(op), `${route.label}: falta ejemplo de respuesta`).toBe(true);

        // (R13.4) Esquema de datos de entrada.
        expect(hasInputSchema(op), `${route.label}: falta esquema de entrada`).toBe(true);

        // (R13.4) Esquema de datos de salida.
        expect(hasResponseSchema(op), `${route.label}: falta esquema de salida`).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});

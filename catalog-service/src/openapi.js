'use strict';

/**
 * openapi.js — especificación OpenAPI 3.0 del catalog-service.
 *
 * Documenta el 100% de los endpoints HTTP del Servicio_Catalogo (R13.2):
 *   - GET    /espacios
 *   - POST   /espacios
 *   - PUT    /espacios/{id}
 *   - DELETE /espacios/{id}
 *   - GET    /ocupacion
 *
 * Cada operación incluye al menos un ejemplo de solicitud y uno de respuesta
 * (R13.3), los códigos HTTP aplicables (200/201/400/401/403/404/500) y los
 * esquemas de entrada/salida (R13.4). Las respuestas de error siguen el contrato
 * uniforme `{ error: { code, message, fields } }`.
 */

const { mountApiDocs } = require('../../shared/openapiMount');

/** Esquema reutilizable del contrato de error uniforme. */
const errorSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string', example: 'Datos de Espacio inválidos' },
        fields: { type: 'array', items: { type: 'string' }, example: ['capacidad'] },
      },
      required: ['code', 'message'],
    },
  },
};

/** Ejemplo canónico de un Espacio para reutilizar en ejemplos. */
const espacioEjemplo = {
  id_espacio: 1,
  nombre: 'Sala Alfa',
  tipo: 'Sala de juntas',
  capacidad: 10,
  piso: 2,
  ubicacion: 'Ala norte',
  recursos: ['proyector', 'aire acondicionado'],
  activo: true,
};

const espacioInputEjemplo = {
  nombre: 'Sala Alfa',
  tipo: 'Sala de juntas',
  capacidad: 10,
  piso: 2,
  ubicacion: 'Ala norte',
  recursos: [1, 2],
};

/** Error 401 reutilizable. */
const respuesta401 = {
  description: 'Token_JWT ausente, expirado o con firma inválida.',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: { error: { code: 'AUTHENTICATION_ERROR', message: 'Se requiere autenticación' } },
    },
  },
};

/** Error 403 reutilizable. */
const respuesta403 = {
  description: 'Rol insuficiente (se requiere ADMINISTRADOR).',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: { error: { code: 'AUTHORIZATION_ERROR', message: 'Permisos insuficientes' } },
    },
  },
};

/** Error 404 reutilizable. */
const respuesta404 = {
  description: 'Espacio inexistente.',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: { error: { code: 'NOT_FOUND', message: 'Espacio no encontrado' } },
    },
  },
};

/** Error 400 reutilizable. */
const respuesta400 = {
  description: 'Datos inválidos o campos obligatorios faltantes.',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de Espacio inválidos',
          fields: ['capacidad'],
        },
      },
    },
  },
};

/** Error 500 reutilizable. */
const respuesta500 = {
  description: 'Error interno no controlado.',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: { error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } },
    },
  },
};

/**
 * Construye la especificación OpenAPI 3.0 del catalog-service.
 * @returns {object} Documento OpenAPI 3.0.
 */
function buildSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'OfficeSpace - catalog-service',
      version: '1.0.0',
      description: 'Servicio de catálogo: CRUD de Espacios y Tablero_Ocupacion.',
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        EspacioInput: {
          type: 'object',
          required: ['nombre', 'tipo', 'capacidad', 'piso', 'ubicacion'],
          properties: {
            nombre: { type: 'string', minLength: 1, maxLength: 100, example: 'Sala Alfa' },
            tipo: {
              type: 'string',
              enum: ['Sala de juntas', 'Escritorio individual'],
              example: 'Sala de juntas',
            },
            capacidad: { type: 'integer', minimum: 1, maximum: 1000, example: 10 },
            piso: { type: 'integer', example: 2 },
            ubicacion: { type: 'string', example: 'Ala norte' },
            recursos: {
              type: 'array',
              items: { type: 'integer' },
              example: [1, 2],
              description: 'IDs de Recurso asociados (relación muchos-a-muchos).',
            },
          },
        },
        Espacio: {
          type: 'object',
          properties: {
            id_espacio: { type: 'integer', example: 1 },
            nombre: { type: 'string', example: 'Sala Alfa' },
            tipo: {
              type: 'string',
              enum: ['Sala de juntas', 'Escritorio individual'],
              example: 'Sala de juntas',
            },
            capacidad: { type: 'integer', example: 10 },
            piso: { type: 'integer', example: 2 },
            ubicacion: { type: 'string', example: 'Ala norte' },
            recursos: { type: 'array', items: { type: 'string' }, example: ['proyector'] },
            activo: { type: 'boolean', example: true },
          },
        },
        OcupacionItem: {
          type: 'object',
          properties: {
            id_espacio: { type: 'integer', example: 1 },
            nombre: { type: 'string', example: 'Sala Alfa' },
            piso: { type: 'integer', example: 2 },
            ubicacion: { type: 'string', example: 'Ala norte' },
            estado: { type: 'string', enum: ['ocupado', 'libre'], example: 'ocupado' },
          },
        },
        Recurso: {
          type: 'object',
          properties: {
            id_recurso: { type: 'integer', example: 1 },
            nombre: { type: 'string', example: 'Proyector' },
          },
        },
        Error: errorSchema,
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/espacios': {
        get: {
          summary: 'Listar Espacios',
          description: 'Devuelve los Espacios con sus atributos y Recursos asociados.',
          tags: ['Espacios'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'Authorization',
              in: 'header',
              required: true,
              schema: { type: 'string' },
              example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          ],
          responses: {
            200: {
              description: 'Lista de Espacios.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      espacios: { type: 'array', items: { $ref: '#/components/schemas/Espacio' } },
                    },
                  },
                  example: { espacios: [espacioEjemplo] },
                },
              },
            },
            401: respuesta401,
            500: respuesta500,
          },
        },
        post: {
          summary: 'Crear Espacio',
          description: 'Crea un Espacio. Requiere Rol ADMINISTRADOR.',
          tags: ['Espacios'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EspacioInput' },
                example: espacioInputEjemplo,
              },
            },
          },
          responses: {
            201: {
              description: 'Espacio creado.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { espacio: { $ref: '#/components/schemas/Espacio' } },
                  },
                  example: { espacio: espacioEjemplo },
                },
              },
            },
            400: respuesta400,
            401: respuesta401,
            403: respuesta403,
            500: respuesta500,
          },
        },
      },
      '/espacios/{id}': {
        put: {
          summary: 'Actualizar Espacio',
          description: 'Actualiza un Espacio existente. Requiere Rol ADMINISTRADOR.',
          tags: ['Espacios'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              example: 1,
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EspacioInput' },
                example: espacioInputEjemplo,
              },
            },
          },
          responses: {
            200: {
              description: 'Espacio actualizado.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { espacio: { $ref: '#/components/schemas/Espacio' } },
                  },
                  example: { espacio: espacioEjemplo },
                },
              },
            },
            400: respuesta400,
            401: respuesta401,
            403: respuesta403,
            404: respuesta404,
            500: respuesta500,
          },
        },
        delete: {
          summary: 'Eliminar Espacio',
          description: 'Elimina un Espacio existente. Requiere Rol ADMINISTRADOR.',
          tags: ['Espacios'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              example: 1,
            },
          ],
          responses: {
            200: {
              description: 'Espacio eliminado.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '1' },
                      eliminado: { type: 'boolean', example: true },
                    },
                  },
                  example: { id: '1', eliminado: true },
                },
              },
            },
            401: respuesta401,
            403: respuesta403,
            404: respuesta404,
            500: respuesta500,
          },
        },
      },
      '/recursos': {
        get: {
          summary: 'Listar catálogo de Recursos',
          description:
            'Devuelve el catálogo completo de Recursos (id y nombre) para checklists y filtros. Cualquier Usuario autenticado.',
          tags: ['Recursos'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'Authorization',
              in: 'header',
              required: true,
              schema: { type: 'string' },
              example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          ],
          responses: {
            200: {
              description: 'Catálogo de Recursos.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      recursos: { type: 'array', items: { $ref: '#/components/schemas/Recurso' } },
                    },
                  },
                  example: {
                    recursos: [
                      { id_recurso: 1, nombre: 'Proyector' },
                      { id_recurso: 2, nombre: 'Pantalla' },
                    ],
                  },
                },
              },
            },
            401: respuesta401,
            500: respuesta500,
          },
        },
      },
      '/ocupacion': {
        get: {
          summary: 'Tablero de Ocupación',
          description:
            'Devuelve el estado (ocupado/libre) de cada Espacio para la fecha actual. Requiere Rol ADMINISTRADOR.',
          tags: ['Ocupación'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'Authorization',
              in: 'header',
              required: true,
              schema: { type: 'string' },
              example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          ],
          responses: {
            200: {
              description: 'Estado de ocupación por Espacio (colección vacía si no hay Espacios).',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ocupacion: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/OcupacionItem' },
                      },
                    },
                  },
                  example: {
                    ocupacion: [
                      {
                        id_espacio: 1,
                        nombre: 'Sala Alfa',
                        piso: 2,
                        ubicacion: 'Ala norte',
                        estado: 'ocupado',
                      },
                    ],
                  },
                },
              },
            },
            401: respuesta401,
            403: respuesta403,
            500: respuesta500,
          },
        },
      },
    },
  };
}

/**
 * Monta la documentación OpenAPI del catalog-service de forma aislada (R13.5).
 * @param {import('express').Express} app
 * @param {{ logger?: (err: any) => void }} [opts]
 * @returns {{ mounted: boolean, error?: Error, spec?: object }}
 */
function mountCatalogApiDocs(app, opts = {}) {
  // eslint-disable-next-line global-require
  const swaggerUi = require('swagger-ui-express');
  return mountApiDocs(app, { swaggerUi, buildSpec, logger: opts.logger });
}

module.exports = { buildSpec, mountCatalogApiDocs };

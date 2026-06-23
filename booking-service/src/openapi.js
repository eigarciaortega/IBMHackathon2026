'use strict';

/**
 * openapi.js — especificación OpenAPI 3.0 del booking-service.
 *
 * Documenta el 100% de los endpoints HTTP del Servicio_Reservas según el
 * contrato del diseño (R13.2). Los endpoints se implementan en las tareas 7.x;
 * esta especificación documenta el contrato con independencia de su estado de
 * implementación:
 *   - GET    /disponibilidad
 *   - POST   /reservas
 *   - GET    /reservas/mias
 *   - DELETE /reservas/{id}
 *
 * Cada operación incluye al menos un ejemplo de solicitud y uno de respuesta
 * (R13.3), los códigos HTTP aplicables (200/201/400/401/403/404/409/500) y los
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
        code: { type: 'string', example: 'OVERLAP_CONFLICT' },
        message: { type: 'string', example: 'La reserva solapa con otra existente' },
        fields: { type: 'array', items: { type: 'string' }, example: ['horaFin'] },
      },
      required: ['code', 'message'],
    },
  },
};

const reservaEjemplo = {
  id_reserva: 1,
  id_espacio: 1,
  id_usuario: 2,
  fecha_inicio: '2025-12-01T09:00:00Z',
  fecha_fin: '2025-12-01T10:00:00Z',
  cantidad_asistentes: 4,
  estado_reserva: 'Activo',
  estado_asistencia: 'show',
  fecha_creacion: '2025-11-20T12:00:00Z',
  fecha_cancelacion: null,
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

/** Error 400 reutilizable. */
const respuesta400 = {
  description: 'Parámetros inválidos (rango de hora, fecha en el pasado, asistentes, campos).',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La hora de fin debe ser posterior a la hora de inicio',
          fields: ['horaFin'],
        },
      },
    },
  },
};

/** Error 404 reutilizable. */
const respuesta404 = {
  description: 'Identificador inexistente (Espacio o Reserva).',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: { error: { code: 'NOT_FOUND', message: 'Recurso no encontrado' } },
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
 * Construye la especificación OpenAPI 3.0 del booking-service.
 * @returns {object} Documento OpenAPI 3.0.
 */
function buildSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'OfficeSpace - booking-service',
      version: '1.0.0',
      description:
        'Servicio de reservas: búsqueda de disponibilidad, motor de validación, Mis Reservas y cancelación.',
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        ReservaInput: {
          type: 'object',
          required: ['idEspacio', 'fechaInicio', 'fechaFin', 'asistentes'],
          properties: {
            idEspacio: { type: 'integer', example: 1 },
            fechaInicio: { type: 'string', format: 'date-time', example: '2025-12-01T09:00:00Z' },
            fechaFin: { type: 'string', format: 'date-time', example: '2025-12-01T10:00:00Z' },
            asistentes: { type: 'integer', minimum: 1, example: 4 },
          },
        },
        Reserva: {
          type: 'object',
          properties: {
            id_reserva: { type: 'integer', example: 1 },
            id_espacio: { type: 'integer', example: 1 },
            id_usuario: { type: 'integer', example: 2 },
            fecha_inicio: { type: 'string', format: 'date-time' },
            fecha_fin: { type: 'string', format: 'date-time' },
            cantidad_asistentes: { type: 'integer', example: 4 },
            estado_reserva: { type: 'string', enum: ['Activo', 'Cancelado'], example: 'Activo' },
            estado_asistencia: { type: 'string', enum: ['show', 'no-show'], example: 'show' },
            fecha_creacion: { type: 'string', format: 'date-time' },
            fecha_cancelacion: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        EspacioDisponible: {
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
          },
        },
        Error: errorSchema,
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/disponibilidad': {
        get: {
          summary: 'Buscar disponibilidad',
          description:
            'Devuelve los Espacios sin solapamiento para el rango indicado, con filtros opcionales por tipo y capacidad mínima. Requiere Rol COLABORADOR.',
          tags: ['Disponibilidad'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'fecha',
              in: 'query',
              required: true,
              schema: { type: 'string', format: 'date' },
              example: '2025-12-01',
            },
            {
              name: 'horaInicio',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              example: '09:00',
            },
            {
              name: 'horaFin',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              example: '10:00',
            },
            {
              name: 'tipo',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['Sala de juntas', 'Escritorio individual'] },
              example: 'Sala de juntas',
            },
            {
              name: 'capacidadMin',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1 },
              example: 4,
            },
            {
              name: 'recursos',
              in: 'query',
              required: false,
              description:
                'IDs de Recurso requeridos (repetible o separado por comas). El Espacio debe incluirlos todos.',
              schema: { type: 'array', items: { type: 'integer' } },
              example: [1, 2],
            },
          ],
          responses: {
            200: {
              description: 'Espacios disponibles (colección vacía si no hay resultados).',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      espacios: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/EspacioDisponible' },
                      },
                    },
                  },
                  example: {
                    espacios: [
                      {
                        id_espacio: 1,
                        nombre: 'Sala Alfa',
                        tipo: 'Sala de juntas',
                        capacidad: 10,
                        piso: 2,
                        ubicacion: 'Ala norte',
                      },
                    ],
                  },
                },
              },
            },
            400: respuesta400,
            401: respuesta401,
            500: respuesta500,
          },
        },
      },
      '/reservas': {
        get: {
          summary: 'Listar todas las Reservas (ADMINISTRADOR)',
          description:
            'Devuelve todas las Reservas del corporativo con el Espacio y el Usuario propietario. Requiere Rol ADMINISTRADOR.',
          tags: ['Reservas'],
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
              description: 'Todas las Reservas (colección vacía si no hay ninguna).',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      reservas: { type: 'array', items: { $ref: '#/components/schemas/Reserva' } },
                    },
                  },
                  example: { reservas: [reservaEjemplo] },
                },
              },
            },
            401: respuesta401,
            403: {
              description: 'Rol insuficiente (se requiere ADMINISTRADOR).',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    error: { code: 'AUTHORIZATION_ERROR', message: 'Permisos insuficientes' },
                  },
                },
              },
            },
            500: respuesta500,
          },
        },
        post: {
          summary: 'Crear Reserva',
          description:
            'Crea una Reserva si no presenta solapamiento y supera las validaciones. Requiere Rol COLABORADOR.',
          tags: ['Reservas'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReservaInput' },
                example: {
                  idEspacio: 1,
                  fechaInicio: '2025-12-01T09:00:00Z',
                  fechaFin: '2025-12-01T10:00:00Z',
                  asistentes: 4,
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Reserva creada.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { reserva: { $ref: '#/components/schemas/Reserva' } },
                  },
                  example: { reserva: reservaEjemplo },
                },
              },
            },
            400: respuesta400,
            401: respuesta401,
            404: respuesta404,
            409: {
              description: 'Solapamiento con una Reserva existente.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    error: {
                      code: 'OVERLAP_CONFLICT',
                      message: 'La reserva solapa con otra existente',
                    },
                  },
                },
              },
            },
            500: respuesta500,
          },
        },
      },
      '/reservas/mias': {
        get: {
          summary: 'Listar Mis Reservas',
          description:
            'Devuelve las Reservas del Usuario solicitante (pasadas y futuras). Requiere Rol COLABORADOR.',
          tags: ['Reservas'],
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
              description: 'Reservas del solicitante (colección vacía si no posee ninguna).',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      reservas: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Reserva' },
                      },
                    },
                  },
                  example: { reservas: [reservaEjemplo] },
                },
              },
            },
            401: respuesta401,
            500: respuesta500,
          },
        },
      },
      '/reservas/{id}': {
        put: {
          summary: 'Editar Reserva',
          description:
            'Modifica el rango y/o el número de asistentes de una Reserva propia, futura y no cancelada. Requiere Rol COLABORADOR y ser propietario.',
          tags: ['Reservas'],
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
                schema: { $ref: '#/components/schemas/ReservaInput' },
                example: {
                  idEspacio: 1,
                  fechaInicio: '2025-12-01T11:00:00Z',
                  fechaFin: '2025-12-01T12:00:00Z',
                  asistentes: 3,
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Reserva actualizada.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { reserva: { $ref: '#/components/schemas/Reserva' } },
                  },
                  example: { reserva: reservaEjemplo },
                },
              },
            },
            400: respuesta400,
            401: respuesta401,
            403: {
              description: 'La Reserva no pertenece al Usuario solicitante.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    error: { code: 'AUTHORIZATION_ERROR', message: 'Permisos insuficientes' },
                  },
                },
              },
            },
            404: respuesta404,
            409: {
              description: 'Solapamiento con una Reserva existente.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    error: { code: 'OVERLAP_CONFLICT', message: 'La reserva solapa con otra' },
                  },
                },
              },
            },
            500: respuesta500,
          },
        },
        delete: {
          summary: 'Cancelar Reserva',
          description:
            'Cancela una Reserva propia futura no cancelada. Requiere Rol COLABORADOR y ser propietario.',
          tags: ['Reservas'],
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
              description: 'Reserva cancelada.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { reserva: { $ref: '#/components/schemas/Reserva' } },
                  },
                  example: {
                    reserva: {
                      ...reservaEjemplo,
                      estado_reserva: 'Cancelado',
                      fecha_cancelacion: '2025-11-21T08:00:00Z',
                    },
                  },
                },
              },
            },
            400: respuesta400,
            401: respuesta401,
            403: {
              description: 'La Reserva no pertenece al Usuario solicitante.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    error: { code: 'AUTHORIZATION_ERROR', message: 'Permisos insuficientes' },
                  },
                },
              },
            },
            404: respuesta404,
            500: respuesta500,
          },
        },
      },
    },
  };
}

/**
 * Monta la documentación OpenAPI del booking-service de forma aislada (R13.5).
 * @param {import('express').Express} app
 * @param {{ logger?: (err: any) => void }} [opts]
 * @returns {{ mounted: boolean, error?: Error, spec?: object }}
 */
function mountBookingApiDocs(app, opts = {}) {
  // eslint-disable-next-line global-require
  const swaggerUi = require('swagger-ui-express');
  return mountApiDocs(app, { swaggerUi, buildSpec, logger: opts.logger });
}

module.exports = { buildSpec, mountBookingApiDocs };

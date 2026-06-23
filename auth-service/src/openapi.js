'use strict';

/**
 * openapi.js — especificación OpenAPI 3.0 del auth-service.
 *
 * Documenta el 100% de los endpoints HTTP del Servicio_Autenticacion (R13.2):
 *   - POST /auth/login
 *   - GET  /auth/verify
 *
 * Cada operación incluye al menos un ejemplo de solicitud y uno de respuesta
 * (R13.3), los códigos HTTP aplicables y los esquemas de entrada/salida (R13.4).
 * Todas las respuestas de error siguen el contrato uniforme
 * `{ error: { code, message, fields } }`.
 */

const { mountApiDocs } = require('../../shared/openapiMount');

/** Esquema reutilizable del contrato de error uniforme. */
const errorSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'AUTHENTICATION_ERROR' },
        message: { type: 'string', example: 'Usuario o contraseña incorrectos' },
        fields: {
          type: 'array',
          items: { type: 'string' },
          example: ['usuario'],
        },
      },
      required: ['code', 'message'],
    },
  },
};

/**
 * Construye la especificación OpenAPI 3.0 del auth-service.
 * @returns {object} Documento OpenAPI 3.0.
 */
function buildSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'OfficeSpace - auth-service',
      version: '1.0.0',
      description:
        'Servicio de autenticación: validación de credenciales, emisión y verificación de Token_JWT.',
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        LoginRequest: {
          type: 'object',
          required: ['usuario', 'password'],
          properties: {
            usuario: {
              type: 'string',
              minLength: 1,
              maxLength: 254,
              example: 'admin@corporativoalpha.com',
            },
            password: {
              type: 'string',
              minLength: 1,
              maxLength: 128,
              example: 'Admin123',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            role: {
              type: 'string',
              enum: ['ADMINISTRADOR', 'COLABORADOR'],
              example: 'ADMINISTRADOR',
            },
            expiresIn: { type: 'integer', example: 3600 },
          },
        },
        VerifyResponse: {
          type: 'object',
          properties: {
            sub: { type: 'string', example: '1' },
            role: {
              type: 'string',
              enum: ['ADMINISTRADOR', 'COLABORADOR'],
              example: 'COLABORADOR',
            },
          },
        },
        Error: errorSchema,
      },
    },
    paths: {
      '/auth/login': {
        post: {
          summary: 'Iniciar sesión y emitir Token_JWT',
          description:
            'Valida credenciales y emite un Token_JWT (validez 3600 s). Bloquea tras 5 fallos consecutivos durante 300 s.',
          tags: ['Autenticación'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' },
                example: { usuario: 'admin@corporativoalpha.com', password: 'Admin123' },
              },
            },
          },
          responses: {
            200: {
              description: 'Autenticación exitosa: Token_JWT emitido.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/LoginResponse' },
                  example: {
                    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    role: 'ADMINISTRADOR',
                    expiresIn: 3600,
                  },
                },
              },
            },
            400: {
              description: 'Campo usuario/contraseña ausente, vacío o fuera de rango.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    error: {
                      code: 'VALIDATION_ERROR',
                      message: 'Credenciales con formato inválido',
                      fields: ['password'],
                    },
                  },
                },
              },
            },
            401: {
              description: 'Credenciales inválidas.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    error: {
                      code: 'AUTHENTICATION_ERROR',
                      message: 'Usuario o contraseña incorrectos',
                    },
                  },
                },
              },
            },
            429: {
              description: 'Cuenta bloqueada por 5 intentos fallidos consecutivos (300 s).',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    error: {
                      code: 'TOO_MANY_ATTEMPTS',
                      message:
                        'Cuenta bloqueada temporalmente por demasiados intentos fallidos',
                    },
                  },
                },
              },
            },
            500: {
              description: 'Error interno no controlado.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
                  },
                },
              },
            },
          },
        },
      },
      '/auth/verify': {
        get: {
          summary: 'Verificar Token_JWT',
          description: 'Valida el Token_JWT del encabezado Authorization y devuelve { sub, role }.',
          tags: ['Autenticación'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'Authorization',
              in: 'header',
              required: true,
              description: 'Token_JWT en formato Bearer.',
              schema: { type: 'string' },
              example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          ],
          responses: {
            200: {
              description: 'Token válido.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/VerifyResponse' },
                  example: { sub: '1', role: 'ADMINISTRADOR' },
                },
              },
            },
            401: {
              description: 'Token ausente, expirado o con firma inválida.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    error: {
                      code: 'AUTHENTICATION_ERROR',
                      message: 'Se requiere autenticación',
                    },
                  },
                },
              },
            },
            500: {
              description: 'Error interno no controlado.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

/**
 * Monta la documentación OpenAPI del auth-service de forma aislada (R13.5).
 * @param {import('express').Express} app
 * @param {{ logger?: (err: any) => void }} [opts]
 * @returns {{ mounted: boolean, error?: Error, spec?: object }}
 */
function mountAuthApiDocs(app, opts = {}) {
  // eslint-disable-next-line global-require
  const swaggerUi = require('swagger-ui-express');
  return mountApiDocs(app, { swaggerUi, buildSpec, logger: opts.logger });
}

module.exports = { buildSpec, mountAuthApiDocs };

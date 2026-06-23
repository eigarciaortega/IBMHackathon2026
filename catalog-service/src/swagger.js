// OpenAPI 3 specification for catalog-service, served at /api-docs.
// We build the full spec with swagger-jsdoc using an inline definition
// (no file globs) so it works identically in local dev and inside Docker.
const swaggerJSDoc = require('swagger-jsdoc');

const spaceSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    name: { type: 'string', example: 'Sala Quetzal' },
    type: { type: 'string', enum: ['SALA', 'DESK'], example: 'SALA' },
    capacity: { type: 'integer', example: 8 },
    floor: { type: 'string', example: 'Piso 3' },
    has_projector: { type: 'boolean', example: true },
    has_ac: { type: 'boolean', example: true },
    is_active: { type: 'boolean', example: true },
    created_at: { type: 'string', format: 'date-time' },
  },
};

const spaceInput = {
  type: 'object',
  required: ['name', 'type', 'capacity'],
  properties: {
    name: { type: 'string', example: 'Sala Quetzal' },
    type: { type: 'string', enum: ['SALA', 'DESK'], example: 'SALA' },
    capacity: { type: 'integer', minimum: 1, example: 8 },
    floor: { type: 'string', example: 'Piso 3' },
    has_projector: { type: 'boolean', example: true },
    has_ac: { type: 'boolean', example: true },
  },
};

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'OfficeSpace — Catalog Service API',
    version: '1.0.0',
    description:
      'Catálogo de espacios y dashboard de ocupación. Todas las rutas requieren ' +
      'un JWT válido (obtenido desde booking-service `POST /auth/login`). ' +
      'Las operaciones de escritura sobre espacios y el dashboard requieren rol ADMIN.',
  },
  servers: [{ url: 'http://localhost:3001', description: 'Local / Docker' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Space: spaceSchema,
      SpaceInput: spaceInput,
      Error: {
        type: 'object',
        properties: { error: { type: 'string', example: 'Admin access required' } },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Spaces', description: 'CRUD de espacios y disponibilidad' },
    { name: 'Dashboard', description: 'Ocupación del día (ADMIN)' },
    { name: 'Health', description: 'Estado del servicio' },
  ],
  paths: {
    '/spaces': {
      get: {
        tags: ['Spaces'],
        summary: 'Listar espacios (con filtros)',
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['SALA', 'DESK'] } },
          { name: 'min_capacity', in: 'query', schema: { type: 'integer' } },
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'start', in: 'query', schema: { type: 'string' } },
          { name: 'end', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Lista de espacios',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Space' } },
              },
            },
          },
          401: { description: 'Sin token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        tags: ['Spaces'],
        summary: 'Crear espacio (ADMIN)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SpaceInput' } } },
        },
        responses: {
          201: { description: 'Espacio creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Space' } } } },
          400: { description: 'Datos inválidos' },
          403: { description: 'No es ADMIN' },
        },
      },
    },
    '/spaces/availability': {
      get: {
        tags: ['Spaces'],
        summary: 'Espacios disponibles en un rango horario',
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'start', in: 'query', schema: { type: 'string' } },
          { name: 'end', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Espacios libres en el rango' } },
      },
    },
    '/spaces/{id}': {
      get: {
        tags: ['Spaces'],
        summary: 'Obtener un espacio',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Espacio', content: { 'application/json': { schema: { $ref: '#/components/schemas/Space' } } } },
          404: { description: 'No encontrado' },
        },
      },
      put: {
        tags: ['Spaces'],
        summary: 'Actualizar espacio (ADMIN)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SpaceInput' } } },
        },
        responses: { 200: { description: 'Actualizado' }, 403: { description: 'No es ADMIN' }, 404: { description: 'No encontrado' } },
      },
      delete: {
        tags: ['Spaces'],
        summary: 'Eliminar espacio (ADMIN)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Eliminado' }, 403: { description: 'No es ADMIN' }, 404: { description: 'No encontrado' } },
      },
    },
    '/dashboard/today': {
      get: {
        tags: ['Dashboard'],
        summary: 'Resumen de ocupación en este momento (ADMIN)',
        responses: {
          200: {
            description:
              'Resumen (ocupados/libres AHORA mismo) + ocupación por espacio. ' +
              'Cada espacio incluye is_occupied_now, current_booking (quién lo ocupa ahora) ' +
              'y bookings (horario de reservas actuales y futuras con su responsable).',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    summary: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 10 },
                        occupied: { type: 'integer', example: 3 },
                        free: { type: 'integer', example: 7 },
                      },
                    },
                    spaces: { type: 'array', items: { $ref: '#/components/schemas/Space' } },
                  },
                },
              },
            },
          },
          403: { description: 'No es ADMIN' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        security: [],
        responses: { 200: { description: 'Servicio operativo' } },
      },
    },
  },
};

module.exports = swaggerJSDoc({ definition, apis: [] });

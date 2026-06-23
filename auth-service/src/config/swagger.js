/**
 * Configuración de Swagger / OpenAPI para el auth-service.
 * Documentación interactiva disponible en /api-docs.
 */
const swaggerJSDoc = require('swagger-jsdoc')

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'IBM OfficeSpace · Auth Service',
      version: '1.0.0',
      description:
        'Microservicio de autenticación. Emite y valida tokens JWT para el ecosistema IBM OfficeSpace.',
    },
    servers: [{ url: 'http://localhost:4001', description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Credenciales: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'admin@corporativoalpha.com' },
            password: { type: 'string', example: 'Admin123' },
          },
        },
        Usuario: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            full_name: { type: 'string', example: 'Administrador IBM' },
            email: { type: 'string', example: 'admin@corporativoalpha.com' },
            role: { type: 'string', enum: ['ADMINISTRADOR', 'COLABORADOR'] },
          },
        },
        RespuestaLogin: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiІ...' },
            user: { $ref: '#/components/schemas/Usuario' },
          },
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
})

module.exports = swaggerSpec

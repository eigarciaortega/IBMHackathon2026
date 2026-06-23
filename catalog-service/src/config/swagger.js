const swaggerJSDoc = require('swagger-jsdoc')

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'IBM OfficeSpace · Catalog Service',
      version: '1.0.0',
      description:
        'Microservicio de gestión de espacios (salas de juntas y escritorios). CRUD protegido por JWT; las operaciones de escritura requieren rol ADMINISTRADOR.',
    },
    servers: [{ url: 'http://localhost:4002', description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Espacio: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Sala Watson' },
            type: { type: 'string', enum: ['SALA', 'ESCRITORIO'], example: 'SALA' },
            capacity: { type: 'integer', example: 12 },
            floor: { type: 'string', example: 'Piso 3' },
            location: { type: 'string', example: 'Ala Norte' },
            has_projector: { type: 'boolean' },
            has_ac: { type: 'boolean' },
            has_videoconference: { type: 'boolean' },
            active: { type: 'boolean' },
          },
        },
        EspacioInput: {
          type: 'object',
          required: ['name', 'type', 'capacity', 'floor'],
          properties: {
            name: { type: 'string', example: 'Sala Granite' },
            type: { type: 'string', enum: ['SALA', 'ESCRITORIO'] },
            capacity: { type: 'integer', example: 8 },
            floor: { type: 'string', example: 'Piso 4' },
            location: { type: 'string', example: 'Ala Este' },
            has_projector: { type: 'boolean' },
            has_ac: { type: 'boolean' },
            has_videoconference: { type: 'boolean' },
          },
        },
        Error: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  },
  apis: ['./src/routes/*.js'],
})

module.exports = swaggerSpec

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OfficeSpace - Catalog Service',
      version: '1.0.0',
      description: 'API para gestión de espacios de trabajo (salas y escritorios)',
    },
    servers: [{ url: 'http://localhost:3001' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Espacio: {
          type: 'object',
          properties: {
            id:           { type: 'integer', example: 1 },
            nombre:       { type: 'string',  example: 'Sala Creativa' },
            tipo:         { type: 'string',  enum: ['SALA', 'DESK'] },
            capacidad:    { type: 'integer', example: 8 },
            piso:         { type: 'string',  example: 'Piso 2' },
            con_proyector:{ type: 'boolean', example: true },
            con_aire:     { type: 'boolean', example: true },
            con_pizarron: { type: 'boolean', example: false },
            con_tv:       { type: 'boolean', example: false },
            disponible:   { type: 'boolean', example: true },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Mensaje de error' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
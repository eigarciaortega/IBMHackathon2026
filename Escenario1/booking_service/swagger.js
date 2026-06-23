const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OfficeSpace - Booking Service',
      version: '1.0.0',
      description: 'API para gestión de reservas de espacios de trabajo',
    },
    servers: [{ url: 'http://localhost:3002' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Reservacion: {
          type: 'object',
          properties: {
            id:            { type: 'integer', example: 1 },
            espacio_id:    { type: 'integer', example: 2 },
            usuario_id:    { type: 'integer', example: 1 },
            hora_entrada:  { type: 'string', format: 'date-time' },
            hora_salida:   { type: 'string', format: 'date-time' },
            asistentes:    { type: 'integer', example: 5 },
            status:        { type: 'string', enum: ['CONFIRMED', 'CANCELLED'] },
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
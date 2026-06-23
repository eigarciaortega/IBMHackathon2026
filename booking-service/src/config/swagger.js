const swaggerJSDoc = require('swagger-jsdoc')

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'IBM OfficeSpace · Booking Service',
      version: '1.0.0',
      description:
        'Motor de reservas. Garantiza la NO superposición de horarios, valida capacidad, consistencia temporal y fechas. Incluye búsqueda de disponibilidad, analíticas y sugerencias inteligentes.',
    },
    servers: [{ url: 'http://localhost:4003', description: 'Local' }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        ReservaInput: {
          type: 'object',
          required: ['space_id', 'booking_date', 'start_time', 'end_time', 'attendees'],
          properties: {
            space_id: { type: 'integer', example: 1 },
            booking_date: { type: 'string', format: 'date', example: '2026-06-25' },
            start_time: { type: 'string', example: '09:00' },
            end_time: { type: 'string', example: '10:00' },
            attendees: { type: 'integer', example: 4 },
            title: { type: 'string', example: 'Reunión de Sprint' },
          },
        },
        Reserva: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            space_id: { type: 'integer' },
            user_id: { type: 'integer' },
            title: { type: 'string' },
            booking_date: { type: 'string', format: 'date' },
            start_time: { type: 'string' },
            end_time: { type: 'string' },
            attendees: { type: 'integer' },
            status: { type: 'string', enum: ['CONFIRMADA', 'CANCELADA'] },
          },
        },
        Error: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  },
  apis: ['./src/routes/*.js'],
})

module.exports = swaggerSpec

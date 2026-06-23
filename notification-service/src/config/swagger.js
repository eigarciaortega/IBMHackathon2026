const swaggerJSDoc = require('swagger-jsdoc')

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'NeoWallet · Notification Service',
      version: '1.0.0',
      description:
        '🔔 **Microservicio de Notificaciones** de NeoWallet.\n\n' +
        'Envía confirmaciones por **SMS** y **correo** ante recargas y ' +
        'transferencias, y manda el **estado de cuenta** por email. Funciona ' +
        'sin credenciales (SMS simulados consultables + correos vía Ethereal ' +
        'con URL de vista previa real); con credenciales reales (Twilio/SMTP) ' +
        'envía de verdad. Todo queda guardado en un outbox consultable.',
    },
    servers: [{ url: 'http://localhost:3002', description: 'Local' }],
    tags: [
      { name: 'Envíos', description: 'Disparo de notificaciones' },
      { name: 'Consulta', description: 'Buzón de SMS e historial de correos' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        NotifyInput: {
          type: 'object',
          required: ['channel', 'template', 'to'],
          properties: {
            channel: { type: 'string', enum: ['sms', 'email', 'both'], example: 'both' },
            template: {
              type: 'string',
              enum: ['recharge', 'transfer_sent', 'transfer_received', 'statement'],
              example: 'transfer_sent',
            },
            to: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Usuario A' },
                email: { type: 'string', example: 'usuario.a@neowallet.com' },
                phone: { type: 'string', example: '+5215555550001' },
              },
            },
            data: { type: 'object', example: { amount: '100.00', counterparty: 'Usuario B', transaction_id: 42, new_balance: '900.00' } },
          },
        },
        Error: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  },
  apis: ['./src/routes/*.js'],
})

module.exports = swaggerSpec

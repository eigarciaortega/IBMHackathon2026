const swaggerJSDoc = require('swagger-jsdoc')

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'NeoWallet · Processor Service',
      version: '1.0.0',
      description:
        '🔁 **Microservicio de Procesamiento de Transferencias P2P** de NeoWallet.\n\n' +
        'Orquesta la transferencia con el **patrón Saga**: debita al sender y ' +
        'acredita al receiver vía HTTP contra accounts-service; si el crédito ' +
        'falla, **compensa** devolviendo el dinero (garantía: no se pierde dinero). ' +
        'Incluye idempotencia, historial de transacciones, envío del estado de ' +
        'cuenta por correo y un job de reconciliación.',
    },
    servers: [{ url: 'http://localhost:3001', description: 'Local' }],
    tags: [
      { name: 'Transferencias', description: 'Transferencias P2P con Saga' },
      { name: 'Historial', description: 'Historial y estado de cuenta' },
      { name: 'Resiliencia', description: 'Reconciliación de transacciones' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        TransferInput: {
          type: 'object',
          required: ['receiver_id', 'amount'],
          properties: {
            receiver_id: { type: 'integer', example: 2 },
            amount: { type: 'number', example: 100.0 },
            idempotency_key: { type: 'string', example: 'tx-2026-0001' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            transaction_id: { type: 'integer', example: 42 },
            sender_id: { type: 'integer', example: 1 },
            receiver_id: { type: 'integer', example: 2 },
            amount: { type: 'number', example: 100.0 },
            status: {
              type: 'string',
              enum: ['PENDING', 'DEBITED', 'COMPLETED', 'FAILED', 'ROLLED_BACK'],
              example: 'COMPLETED',
            },
          },
        },
        Error: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  },
  apis: ['./src/routes/*.js'],
})

module.exports = swaggerSpec

const swaggerJSDoc = require('swagger-jsdoc')

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'NeoWallet · Accounts Service',
      version: '1.0.0',
      description:
        '💰 **Microservicio de Cuentas y Saldos** de NeoWallet (FastPay).\n\n' +
        'Es el ÚNICO servicio autorizado a mover dinero. Cada movimiento es ' +
        'atómico (transacción + bloqueo de fila) y queda registrado en un ' +
        'libro mayor de auditoría. Expone consulta de saldo, recarga simulada ' +
        'y el endpoint interno debit/credit que consume la Saga del processor.',
    },
    servers: [{ url: 'http://localhost:8000', description: 'Local' }],
    tags: [
      { name: 'Autenticación', description: 'Registro, inicio de sesión y perfil' },
      { name: 'Cuentas', description: 'Saldo, directorio y recargas (usuario autenticado)' },
      { name: 'Interno', description: 'Endpoints máquina-a-máquina (clave interna)' },
      { name: 'Auditoría', description: 'Libro mayor y conservación del dinero' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Usuario: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Usuario A (Rico)' },
            email: { type: 'string', example: 'usuario.a@neowallet.com' },
            phone: { type: 'string', example: '+52 1 55 5555 0001' },
            balance: { type: 'number', example: 1000.0 },
            balance_formatted: { type: 'string', example: '1000.00' },
          },
        },
        RecargaInput: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: { type: 'number', example: 150.5 },
            payment_method: {
              type: 'string',
              enum: ['CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CASH'],
              example: 'CREDIT_CARD',
            },
          },
        },
        UpdateBalanceInput: {
          type: 'object',
          required: ['user_id', 'amount', 'operation'],
          properties: {
            user_id: { type: 'integer', example: 1 },
            amount: { type: 'number', example: 100.0 },
            operation: { type: 'string', enum: ['debit', 'credit'], example: 'debit' },
            reference: { type: 'string', example: 'transfer:42' },
          },
        },
        Error: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  },
  apis: ['./src/routes/*.js'],
})

module.exports = swaggerSpec

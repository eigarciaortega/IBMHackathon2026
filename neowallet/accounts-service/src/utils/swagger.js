'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NeoWallet - Accounts Service',
      version: '1.0.0',
      description: 'Gestión de cuentas y saldos de usuarios',
    },
    servers: [{ url: 'http://localhost:4000', description: 'Local' }],
    paths: {
      '/accounts/{user_id}': {
        get: {
          summary: 'Consultar saldo de un usuario',
          tags: ['Accounts'],
          parameters: [{
            in: 'path', name: 'user_id', required: true,
            schema: { type: 'integer', example: 1 },
          }],
          responses: {
            200: {
              description: 'Usuario encontrado',
              content: { 'application/json': { example: { id: 1, name: 'Alice', email: 'alice@neowallet.com', balance: 1000.00 } } },
            },
            404: { description: 'Usuario no encontrado', content: { 'application/json': { example: { error: 'user_not_found' } } } },
            400: { description: 'ID inválido' },
          },
        },
      },
      '/api/recharge': {
        post: {
          summary: 'Recargar saldo a una wallet',
          tags: ['Accounts'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                example: { user_id: 2, amount: 150.50, payment_method: 'credit_card' },
              },
            },
          },
          responses: {
            200: { description: 'Saldo recargado', content: { 'application/json': { example: { user_id: 2, new_balance: 650.50 } } } },
            400: { description: 'Monto inválido' },
            404: { description: 'Usuario no encontrado' },
          },
        },
      },
      '/accounts/update-balance': {
        post: {
          summary: '[Interno] Actualizar balance (usado por Processor Service)',
          tags: ['Internal'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                example: { user_id: 1, amount: 100.00, operation: 'debit' },
              },
            },
          },
          responses: {
            200: { description: 'Balance actualizado', content: { 'application/json': { example: { user_id: 1, previous_balance: 1000.00, new_balance: 900.00 } } } },
            400: { description: 'Fondos insuficientes o datos inválidos' },
            404: { description: 'Usuario no encontrado' },
          },
        },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);

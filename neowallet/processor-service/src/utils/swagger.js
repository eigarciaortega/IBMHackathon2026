'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NeoWallet - Processor Service',
      version: '1.0.0',
      description: 'Orquestación de transferencias P2P',
    },
    servers: [{ url: 'http://localhost:4001', description: 'Local' }],
    paths: {
      '/api/transfer': {
        post: {
          summary: 'Transferencia P2P entre usuarios',
          tags: ['Transfers'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                example: { sender_id: 1, receiver_id: 2, amount: 100.00 },
              },
            },
          },
          responses: {
            200: {
              description: 'Transferencia completada',
              content: { 'application/json': { example: { transaction_id: 1, status: 'COMPLETED', message: 'Transfer completed successfully' } } },
            },
            400: {
              description: 'Error de negocio',
              content: { 'application/json': { examples: {
                self_transfer: { value: { error: 'self_transfer_not_allowed' } },
                insufficient: { value: { error: 'insufficient_funds' } },
                invalid: { value: { error: 'invalid_amount' } },
              }}},
            },
            404: { description: 'Usuario no encontrado', content: { 'application/json': { example: { error: 'user_not_found' } } } },
          },
        },
      },
      '/api/transactions/{user_id}': {
        get: {
          summary: 'Historial de transacciones de un usuario',
          tags: ['Transfers'],
          parameters: [{
            in: 'path', name: 'user_id', required: true,
            schema: { type: 'integer', example: 1 },
          }],
          responses: {
            200: {
              description: 'Lista de transacciones',
              content: { 'application/json': { example: [
                { id: 1, sender_id: 1, receiver_id: 2, amount: 100.00, status: 'COMPLETED', created_at: '2026-06-23T20:00:00Z' },
              ]}},
            },
          },
        },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);

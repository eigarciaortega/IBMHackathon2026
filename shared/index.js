'use strict';

// Módulos compartidos entre servicios.
// - errors.js (contrato de error + middleware) — tarea 1.3.
// - authMiddleware.js (verificación JWT + requireRole) — tarea 1.4.

const errors = require('./errors');
const auth = require('./authMiddleware');
const openapi = require('./openapiMount');

module.exports = {
  ...errors,
  ...auth,
  ...openapi,
  errors,
  auth,
  openapi,
};

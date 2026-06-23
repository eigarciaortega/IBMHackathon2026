'use strict';

/**
 * db — factoría del pool de conexiones MySQL para catalog-service.
 *
 * Usa `mysql2/promise` para exponer un pool con API basada en promesas, apto
 * para `query`/`execute` y para transacciones vía `pool.getConnection()`.
 *
 * La configuración se toma de variables de entorno (ver `.env`):
 *   - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 *
 * El pool es perezoso: no abre conexiones hasta la primera consulta, por lo que
 * importar este módulo no obliga a tener MySQL disponible (los tests de endpoint
 * inyectan un repositorio simulado y no tocan este pool).
 */

const mysql = require('mysql2/promise');

/**
 * Crea un pool de conexiones MySQL.
 *
 * @param {object} [overrides] - Sobrescrituras de configuración del pool.
 * @returns {import('mysql2/promise').Pool}
 */
function createPool(overrides = {}) {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'officespace',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z', // referencia temporal en UTC (R6.5)
    ...overrides,
  });
}

module.exports = { createPool };

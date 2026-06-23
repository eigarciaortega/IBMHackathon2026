'use strict';

/**
 * db.js — creación perezosa del pool de conexiones MySQL (mysql2/promise).
 *
 * Se aísla en su propio módulo para que `app.js` permanezca testeable sin
 * abrir conexiones: el pool solo se construye cuando el servidor arranca
 * (index.js), no al importar la app.
 */

const mysql = require('mysql2/promise');

/**
 * Crea un pool de conexiones MySQL a partir de las variables de entorno.
 *
 * @returns {import('mysql2/promise').Pool}
 */
function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number.parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'officespace',
    password: process.env.DB_PASSWORD || 'officespace',
    database: process.env.DB_NAME || 'officespace',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z', // referencia temporal en UTC (R6.5)
  });
}

module.exports = { createPool };

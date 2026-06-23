'use strict';

require('dotenv').config();
const mysql = require('mysql2/promise');

const appModule = require('./app');
const { createEspacioRepository } = require('./espacioRepository');
const { crearOcupacionRepository } = require('./ocupacionRepository');

// La factoría de la app puede exportarse como `crearApp` o `createApp` según la
// convención de nombres del catalog-service; se resuelve de forma tolerante.
const construirApp = appModule.crearApp || appModule.createApp;

const PORT = process.env.PORT || process.env.CATALOG_SERVICE_PORT || 3002;

/**
 * Crea el pool de conexiones MySQL compartido a partir de las variables de entorno.
 * @returns {import('mysql2/promise').Pool}
 */
function crearPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'officespace',
    password: process.env.DB_PASSWORD || 'officespace',
    database: process.env.DB_NAME || 'officespace',
    waitForConnections: true,
    connectionLimit: 10,
  });
}

const pool = crearPool();

const app = construirApp({
  repository: createEspacioRepository(pool),
  ocupacionRepository: crearOcupacionRepository(pool),
  jwtSecret: process.env.JWT_SECRET,
  // eslint-disable-next-line no-console
  logger: (err) => console.error('[catalog-service] error no controlado:', err),
});

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`catalog-service escuchando en el puerto ${PORT}`);
  });
}

module.exports = app;

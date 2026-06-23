'use strict';

require('dotenv').config();
const mysql = require('mysql2/promise');

const { crearApp } = require('./app');
const { createReservaRepository } = require('./reservaRepository');
const { createAvailabilityRepository } = require('./availabilityRepository');

const PORT = process.env.PORT || process.env.BOOKING_SERVICE_PORT || 3003;

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

const app = crearApp({
  reservaRepository: createReservaRepository(pool),
  espacioRepository: createAvailabilityRepository(pool),
  jwtSecret: process.env.JWT_SECRET,
  // eslint-disable-next-line no-console
  logger: (err) => console.error('[booking-service] error no controlado:', err),
});

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`booking-service escuchando en el puerto ${PORT}`);
  });
}

module.exports = app;

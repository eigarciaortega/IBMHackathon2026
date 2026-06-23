'use strict';

require('dotenv').config();
const mysql = require('mysql2/promise');

const { crearApp } = require('./app');
const { createReservaRepository } = require('./reservaRepository');
const { createAvailabilityRepository } = require('./availabilityRepository');

const PORT = process.env.PORT || process.env.BOOKING_SERVICE_PORT || 3003;

/** Zona horaria de la oficina (las horas se manejan como hora-pared de la oficina). */
const OFFICE_TZ = process.env.OFFICE_TZ || 'America/Mexico_City';

/**
 * Devuelve el instante actual expresado como la HORA-PARED de la oficina,
 * etiquetada como UTC (sufijo Z). Esto alinea el "ahora" del servidor con las
 * horas que el usuario escribe (que el frontend envía como `...:00Z`), evitando
 * que una hora de hoy aún futura se interprete como pasada por el desfase UTC.
 * Ante cualquier fallo de Intl, cae al instante real del sistema.
 * @returns {Date}
 */
function ahoraOficina() {
  try {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: OFFICE_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(new Date())
      .reduce((acc, p) => {
        if (p.type !== 'literal') acc[p.type] = p.value;
        return acc;
      }, {});
    const hora = partes.hour === '24' ? '00' : partes.hour;
    return new Date(
      `${partes.year}-${partes.month}-${partes.day}T${hora}:${partes.minute}:${partes.second}Z`,
    );
  } catch {
    return new Date();
  }
}

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
  ahora: ahoraOficina,
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

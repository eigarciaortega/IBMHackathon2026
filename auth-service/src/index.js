'use strict';

require('dotenv').config();

const { createPool } = require('./db');
const { createUserRepository } = require('./userRepository');
const { createAuthApp } = require('./app');

const PORT = process.env.PORT || process.env.AUTH_SERVICE_PORT || 3001;

// Construir el pool de MySQL, el repositorio y la app con sus dependencias.
const pool = createPool();
const userRepository = createUserRepository({ pool });
const app = createAuthApp({ userRepository });

// Health check para orquestación / verificación de arranque.
app.get('/health', (req, res) => {
  res.status(200).json({ service: 'auth-service', status: 'ok' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`auth-service escuchando en el puerto ${PORT}`);
  });
}

module.exports = app;

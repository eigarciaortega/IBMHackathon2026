require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const spacesRoutes = require('./routes/spaces');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'catalog-service',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/spaces', spacesRoutes);

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

app.listen(PORT, () => {
  logger.info(`Catalog Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

// Made with Bob

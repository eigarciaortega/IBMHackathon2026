'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./utils/swagger');
const processorRoutes = require('./routes/processorRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'processor-service' }));

// Swagger docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/', processorRoutes);

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
app.use(errorHandler);

module.exports = app;

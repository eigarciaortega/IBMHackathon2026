'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./utils/swagger');
const accountRoutes = require('./routes/accountRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'accounts-service' }));

// Swagger docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/', accountRoutes);

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
app.use(errorHandler);

module.exports = app;

'use strict';

const app = require('./app');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.PORT) || 3001;

app.listen(PORT, () => {
  logger.info(`Processor Service listening`, { port: PORT });
});

'use strict';

const app = require('./app');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.PORT) || 3000;

app.listen(PORT, () => {
  logger.info(`Accounts Service listening`, { port: PORT });
});

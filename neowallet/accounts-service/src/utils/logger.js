'use strict';

const LEVELS = { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' };

function log(level, message, meta = {}) {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    service: 'accounts-service',
    message,
    ...meta,
  };
  const output = JSON.stringify(entry);
  if (level === LEVELS.ERROR) {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
}

module.exports = {
  info: (msg, meta) => log(LEVELS.INFO, msg, meta),
  warn: (msg, meta) => log(LEVELS.WARN, msg, meta),
  error: (msg, meta) => log(LEVELS.ERROR, msg, meta),
};

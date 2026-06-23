/**
 * Logger estructurado en JSON (RNF-007 · Observabilidad).
 *
 * Cada llamada imprime UNA línea JSON con timestamp ISO 8601, nivel y
 * nombre del servicio. Esto facilita ingerir los logs en herramientas
 * como ELK, Loki o CloudWatch. Nunca se registran datos sensibles.
 */
const SERVICE = process.env.SERVICE_NAME || 'accounts-service'

function emit(level, msg, meta = {}) {
  const line = { ts: new Date().toISOString(), level, service: SERVICE, msg, ...meta }
  const out = level === 'error' ? process.stderr : process.stdout
  out.write(JSON.stringify(line) + '\n')
}

module.exports = {
  info: (msg, meta) => emit('info', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  error: (msg, meta) => emit('error', msg, meta),
}

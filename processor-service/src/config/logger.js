/**
 * Logger estructurado en JSON (RNF-007 · Observabilidad).
 * Una línea JSON por evento, con timestamp ISO 8601, nivel y servicio.
 * En transferencias se incluye siempre el transaction_id para rastreo.
 */
const SERVICE = process.env.SERVICE_NAME || 'processor-service'

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

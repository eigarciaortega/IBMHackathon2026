/**
 * NeoWallet · Processor Service (Transferencias P2P · Saga)
 *
 * Arranque del microservicio: middlewares, observabilidad, Swagger, health
 * check con verificación de BD, arranque del job de reconciliación y apagado
 * ordenado.
 */
require('dotenv').config()
const { randomUUID } = require('node:crypto')
const express = require('express')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./config/swagger')
const swaggerUiOptions = require('./config/swaggerUiOptions')
const transferRoutes = require('./routes/transferRoutes')
const reconciliation = require('./services/reconciliation')
const { pool, query } = require('./config/db')
const logger = require('./config/logger')

const app = express()
app.set('trust proxy', 1)
app.use(cors())
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }))

app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID()
  res.setHeader('x-request-id', req.id)
  next()
})

function serviceError(err) {
  if (err.type === 'entity.too.large') {
    return { status: 413, message: 'La solicitud es demasiado grande' }
  }
  if (['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', '53300', '57014', '57P01'].includes(err.code)) {
    return { status: 503, message: 'Servicio temporalmente no disponible' }
  }
  return { status: 500, message: 'Error interno del servidor' }
}

// Health check: verifica BD propia y dependencia accounts-service.
app.get('/health', async (req, res) => {
  const health = { service: 'processor-service', status: 'ok', db: 'up', accounts: 'unknown' }
  try {
    await query('SELECT 1')
  } catch (err) {
    health.status = 'degraded'
    health.db = 'down'
  }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 1000)
    const url = (process.env.ACCOUNTS_SERVICE_URL || 'http://localhost:8000') + '/health'
    const r = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    health.accounts = r.ok ? 'up' : 'down'
  } catch (_) {
    health.accounts = 'down'
  }
  return res.status(health.status === 'ok' ? 200 : 503).json(health)
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions))
app.get('/openapi.json', (req, res) => res.json(swaggerSpec))
app.use('/', transferRoutes)

app.use((req, res) => res.status(404).json({ error: 'not_found', message: 'Recurso no encontrado' }))
app.use((err, req, res, next) => {
  const { status, message } = serviceError(err)
  logger.error('error no controlado', { reqId: req.id, code: err.code, msg: err.message })
  res.status(status).json({ error: 'internal_error', message })
})

const PORT = process.env.PORT || 3001
process.on('unhandledRejection', (err) => {
  logger.error('promesa no manejada', { msg: err && err.message })
})

const server = app.listen(PORT, () => {
  logger.info('processor-service arriba', { port: Number(PORT), docs: `http://localhost:${PORT}/api-docs` })
  console.log(`🔁 processor-service en http://localhost:${PORT}  ·  docs: /api-docs`)
  // Job de reconciliación (resiliencia).
  reconciliation.start()
})
server.requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS) || 30000
server.keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT_MS) || 65000
server.headersTimeout = Number(process.env.HEADERS_TIMEOUT_MS) || 66000

function shutdown(signal) {
  logger.info('apagando', { signal })
  reconciliation.stop()
  server.close(() => {
    pool.end().then(() => process.exit(0)).catch(() => process.exit(0))
  })
  setTimeout(() => process.exit(1), 10000).unref()
}
;['SIGTERM', 'SIGINT'].forEach((s) => process.on(s, () => shutdown(s)))

module.exports = app

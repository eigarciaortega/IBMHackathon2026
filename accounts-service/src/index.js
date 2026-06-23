/**
 * NeoWallet · Accounts Service (Cuentas y Saldos)
 *
 * Arranque del microservicio: middlewares, observabilidad (request-id +
 * logs JSON), documentación Swagger, health check con verificación de BD y
 * apagado ordenado.
 */
require('dotenv').config()
const { randomUUID } = require('node:crypto')
const express = require('express')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./config/swagger')
const swaggerUiOptions = require('./config/swaggerUiOptions')
const accountRoutes = require('./routes/accountRoutes')
const authRoutes = require('./routes/authRoutes')
const { pool, query } = require('./config/db')
const logger = require('./config/logger')

const app = express()
app.set('trust proxy', 1)
app.use(cors())
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }))

// Observabilidad: cada petición lleva un id único rastreable en los logs.
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID()
  res.setHeader('x-request-id', req.id)
  next()
})

// Traduce errores técnicos a respuestas HTTP limpias.
function serviceError(err) {
  if (err.type === 'entity.too.large') {
    return { status: 413, message: 'La solicitud es demasiado grande' }
  }
  if (['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', '53300', '57014', '57P01'].includes(err.code)) {
    return { status: 503, message: 'Servicio temporalmente no disponible' }
  }
  return { status: 500, message: 'Error interno del servidor' }
}

// Health check con verificación real de la base de datos (RNF-002).
app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1')
    return res.json({ service: 'accounts-service', status: 'ok', db: 'up' })
  } catch (err) {
    return res.status(503).json({ service: 'accounts-service', status: 'degraded', db: 'down' })
  }
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions))
app.get('/openapi.json', (req, res) => res.json(swaggerSpec))
app.use('/', authRoutes)
app.use('/', accountRoutes)

app.use((req, res) => res.status(404).json({ error: 'not_found', message: 'Recurso no encontrado' }))
app.use((err, req, res, next) => {
  const { status, message } = serviceError(err)
  logger.error('error no controlado', { reqId: req.id, code: err.code, msg: err.message })
  res.status(status).json({ error: 'internal_error', message })
})

const PORT = process.env.PORT || 8000
process.on('unhandledRejection', (err) => {
  logger.error('promesa no manejada', { msg: err && err.message })
})

const server = app.listen(PORT, () => {
  logger.info('accounts-service arriba', { port: Number(PORT), docs: `http://localhost:${PORT}/api-docs` })
  console.log(`💰 accounts-service en http://localhost:${PORT}  ·  docs: /api-docs`)
})
server.requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS) || 30000
server.keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT_MS) || 65000
server.headersTimeout = Number(process.env.HEADERS_TIMEOUT_MS) || 66000

// Apagado ordenado: deja de aceptar conexiones y cierra el pool de BD.
function shutdown(signal) {
  logger.info('apagando', { signal })
  server.close(() => {
    pool.end().then(() => process.exit(0)).catch(() => process.exit(0))
  })
  setTimeout(() => process.exit(1), 10000).unref()
}
;['SIGTERM', 'SIGINT'].forEach((s) => process.on(s, () => shutdown(s)))

module.exports = app

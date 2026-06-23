/**
 * IBM OfficeSpace · Booking Service (Motor de Reservas)
 */
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./config/swagger')
const bookingRoutes = require('./routes/bookingRoutes')
const { pool } = require('./config/db')
const { startReminderScheduler, stopReminderScheduler } = require('./services/reminderService')

const app = express()
app.set('trust proxy', 1)
app.use(cors())
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }))

function serviceError(err) {
  if (err.type === 'entity.too.large') {
    return { status: 413, message: 'La solicitud es demasiado grande' }
  }
  if (['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', '53300', '57014', '57P01'].includes(err.code)) {
    return { status: 503, message: 'Servicio temporalmente no disponible' }
  }
  return { status: 500, message: 'Error interno del servidor' }
}

app.get('/health', (req, res) => res.json({ service: 'booking-service', status: 'ok' }))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.get('/openapi.json', (req, res) => res.json(swaggerSpec))
app.use('/', bookingRoutes)

app.use((req, res) => res.status(404).json({ error: 'Recurso no encontrado' }))
app.use((err, req, res, next) => {
  console.error('[booking-service]', err)
  const { status, message } = serviceError(err)
  res.status(status).json({ error: message })
})

const PORT = process.env.PORT || 4003
process.on('unhandledRejection', (err) => {
  console.error('[booking-service] Promesa no manejada', err)
})

const server = app.listen(PORT, () => {
  console.log(`📅 booking-service en http://localhost:${PORT}`)
  console.log(`API docs: http://localhost:${PORT}/api-docs`)
  startReminderScheduler()
})
server.requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS) || 30000
server.keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT_MS) || 65000
server.headersTimeout = Number(process.env.HEADERS_TIMEOUT_MS) || 66000

// Apagado ordenado: deja de aceptar conexiones y cierra el pool de BD.
function shutdown(signal) {
  console.log(`[booking-service] ${signal} recibido, cerrando…`)
  stopReminderScheduler()
  server.close(() => {
    pool
      .end()
      .then(() => process.exit(0))
      .catch(() => process.exit(0))
  })
  // Salvaguarda: si algo se cuelga, forzamos la salida.
  setTimeout(() => process.exit(1), 10000).unref()
}
;['SIGTERM', 'SIGINT'].forEach((s) => process.on(s, () => shutdown(s)))

module.exports = app

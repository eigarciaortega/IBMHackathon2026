/**
 * IBM OfficeSpace · Auth Service
 * Servidor Express del microservicio de autenticación.
 *
 * Expone:
 *   GET  /health        -> sonda de vida del servicio
 *   *    /auth/*         -> login, perfil y listado de usuarios (ver routes)
 *   GET  /api-docs       -> documentación interactiva Swagger UI
 *   GET  /openapi.json   -> especificación OpenAPI en JSON
 */
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./config/swagger')
const authRoutes = require('./routes/authRoutes')
const { pool } = require('./config/db')

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

app.get('/health', (req, res) => res.json({ service: 'auth-service', status: 'ok' }))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.get('/openapi.json', (req, res) => res.json(swaggerSpec))
app.use('/auth', authRoutes)

// 404: cualquier ruta no registrada.
app.use((req, res) => res.status(404).json({ error: 'Recurso no encontrado' }))
// Manejador de errores central: responde 500 sin filtrar detalles internos.
app.use((err, req, res, next) => {
  console.error('[auth-service]', err)
  const { status, message } = serviceError(err)
  res.status(status).json({ error: message })
})

const PORT = process.env.PORT || 4001
process.on('unhandledRejection', (err) => {
  console.error('[auth-service] Promesa no manejada', err)
})

const server = app.listen(PORT, () => {
  console.log(`auth-service escuchando en http://localhost:${PORT}`)
  console.log(`API docs: http://localhost:${PORT}/api-docs`)
})
server.requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS) || 30000
server.keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT_MS) || 65000
server.headersTimeout = Number(process.env.HEADERS_TIMEOUT_MS) || 66000

// Apagado ordenado: deja de aceptar conexiones y cierra el pool de BD.
function shutdown(signal) {
  console.log(`[auth-service] ${signal} recibido, cerrando…`)
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

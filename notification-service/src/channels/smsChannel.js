/**
 * Canal de SMS.
 *
 * · Si hay credenciales de Twilio en el entorno -> envía un SMS REAL.
 * · Si NO las hay -> modo SIMULADO: imprime el SMS en consola con formato
 *   bonito y lo deja registrado en BD para consultarlo por API (buzón).
 *
 * Nunca lanza: siempre devuelve { status, provider, error } para que el
 * controlador persista el resultado.
 */
const logger = require('../config/logger')

const SID = process.env.TWILIO_ACCOUNT_SID
const TOKEN = process.env.TWILIO_AUTH_TOKEN
const FROM = process.env.TWILIO_FROM
const realEnabled = Boolean(SID && TOKEN && FROM)

let client = null
function getClient() {
  if (client) return client
  // Carga perezosa: solo requerimos twilio si de verdad se va a usar.
  const twilio = require('twilio')
  client = twilio(SID, TOKEN)
  return client
}

/** Imprime el SMS simulado como un recuadro legible en los logs. */
function printSimulated(phone, text) {
  const line = '─'.repeat(54)
  process.stdout.write(
    `\n┌${line}┐\n` +
    `│ 📱 SMS (SIMULADO) → ${phone}\n` +
    `│ ${text}\n` +
    `└${line}┘\n\n`,
  )
}

async function send(phone, name, text) {
  if (!phone) return { status: 'FAILED', provider: 'none', error: 'sin_telefono' }

  if (!realEnabled) {
    printSimulated(phone, text)
    logger.info('sms simulado', { to: phone })
    return { status: 'SIMULATED', provider: 'console', error: null }
  }

  try {
    const msg = await getClient().messages.create({ from: FROM, to: phone, body: text })
    logger.info('sms enviado por twilio', { to: phone, sid: msg.sid })
    return { status: 'SENT', provider: 'twilio', error: null }
  } catch (err) {
    logger.error('sms twilio fallo', { to: phone, msg: err.message })
    return { status: 'FAILED', provider: 'twilio', error: err.message }
  }
}

module.exports = { send, realEnabled }

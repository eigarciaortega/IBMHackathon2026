/**
 * Canal de correo (nodemailer).
 *
 * Estrategia de transporte (en orden):
 *   1. SMTP real si SMTP_HOST está configurado (Gmail, SendGrid, etc.).
 *   2. Cuenta de prueba ETHEREAL auto-generada -> envío real con URL de
 *      vista previa (perfecto para demo, no llega a buzones reales).
 *   3. Si no hay red para crear la cuenta Ethereal -> modo SIMULADO:
 *      no se envía, pero el correo igual se guarda y es consultable por API.
 *
 * Nunca lanza: devuelve { status, provider, previewUrl, error }.
 */
const nodemailer = require('nodemailer')
const logger = require('../config/logger')

const FROM = process.env.EMAIL_FROM || 'NeoWallet <no-reply@neowallet.com>'
const smtpEnabled = Boolean(process.env.SMTP_HOST)

let transporterPromise = null

/** Construye (una sola vez) el transporter adecuado. */
function getTransporter() {
  if (transporterPromise) return transporterPromise
  transporterPromise = (async () => {
    if (smtpEnabled) {
      return {
        provider: 'smtp',
        transport: nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        }),
      }
    }
    // Cuenta de prueba Ethereal (requiere salida a internet).
    const testAccount = await nodemailer.createTestAccount()
    logger.info('cuenta ethereal creada', { user: testAccount.user })
    return {
      provider: 'ethereal',
      transport: nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      }),
    }
  })().catch((err) => {
    // Sin red para Ethereal: caemos a modo simulado (transport nulo).
    logger.warn('no se pudo crear transporte de correo, modo simulado', { msg: err.message })
    transporterPromise = null // permitir reintento futuro
    return { provider: 'stored-only', transport: null }
  })
  return transporterPromise
}

async function send(email, name, subject, html) {
  if (!email) return { status: 'FAILED', provider: 'none', previewUrl: null, error: 'sin_correo' }

  let t
  try {
    t = await getTransporter()
  } catch (err) {
    return { status: 'SIMULATED', provider: 'stored-only', previewUrl: null, error: err.message }
  }

  // Sin transporte disponible: se guarda pero no se envía.
  if (!t.transport) {
    logger.info('correo simulado (sin transporte)', { to: email })
    return { status: 'SIMULATED', provider: 'stored-only', previewUrl: null, error: null }
  }

  try {
    const info = await t.transport.sendMail({
      from: FROM,
      to: name ? `${name} <${email}>` : email,
      subject,
      html,
    })
    const previewUrl = nodemailer.getTestMessageUrl(info) || null
    logger.info('correo enviado', { to: email, provider: t.provider, previewUrl })
    return { status: 'SENT', provider: t.provider, previewUrl, error: null }
  } catch (err) {
    logger.error('correo fallo', { to: email, msg: err.message })
    return { status: 'FAILED', provider: t.provider, previewUrl: null, error: err.message }
  }
}

module.exports = { send, smtpEnabled }

/**
 * Controlador del notification-service: recibe peticiones de aviso, renderiza
 * la plantilla, envía por el canal correspondiente (SMS y/o correo) y guarda
 * todo en el outbox para poder consultarlo después.
 */
const { validationResult } = require('express-validator')
const repo = require('../repositories/notificationRepo')
const { render, TEMPLATES } = require('../templates/templates')
const smsChannel = require('../channels/smsChannel')
const emailChannel = require('../channels/emailChannel')
const logger = require('../config/logger')

function collectErrors(req, res) {
  const result = validationResult(req)
  if (result.isEmpty()) return false
  res.status(400).json({ error: 'invalid_request', detalles: result.array() })
  return true
}

// ---------------------------------------------------------------------
// POST /api/notify  — Enviar una notificación (SMS y/o correo)
// ---------------------------------------------------------------------
async function notify(req, res, next) {
  if (collectErrors(req, res)) return
  const { channel, to, template, data } = req.body

  if (!TEMPLATES.includes(template)) {
    return res.status(400).json({ error: 'invalid_template', message: `template debe ser uno de: ${TEMPLATES.join(', ')}` })
  }

  const rendered = render(template, data || {})
  const wantSms = (channel === 'sms' || channel === 'both') && rendered.sms && to && to.phone
  const wantEmail = (channel === 'email' || channel === 'both') && to && to.email

  const out = {}

  try {
    // --- SMS ---------------------------------------------------------
    if (wantSms) {
      const r = await smsChannel.send(to.phone, to.name, rendered.sms)
      const saved = await repo.save({
        channel: 'sms', recipient: to.phone, recipient_name: to.name,
        template, subject: null, body: rendered.sms,
        status: r.status, provider: r.provider, preview_url: null,
        error_message: r.error, meta: data || {},
      })
      out.sms = { id: saved.id, status: saved.status, provider: saved.provider }
    }

    // --- Correo ------------------------------------------------------
    if (wantEmail) {
      const r = await emailChannel.send(to.email, to.name, rendered.subject, rendered.html)
      const saved = await repo.save({
        channel: 'email', recipient: to.email, recipient_name: to.name,
        template, subject: rendered.subject, body: rendered.html,
        status: r.status, provider: r.provider, preview_url: r.previewUrl,
        error_message: r.error, meta: data || {},
      })
      out.email = { id: saved.id, status: saved.status, provider: saved.provider, preview_url: saved.preview_url }
    }

    logger.info('notificacion procesada', { template, channel, sms: !!out.sms, email: !!out.email })
    return res.status(201).json({ message: 'Notificación procesada', template, ...out })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------
// GET /api/notifications/mine  — Avisos del usuario autenticado
// ---------------------------------------------------------------------
// Devuelve SMS y correos del propio usuario (según teléfono/correo del token).
async function getMine(req, res, next) {
  try {
    const [sms, emails] = await Promise.all([
      req.user.phone ? repo.listByPhone(req.user.phone) : Promise.resolve([]),
      req.user.email ? repo.listByEmail(req.user.email) : Promise.resolve([]),
    ])
    return res.json({
      sms: sms.map(repo.present),
      emails: emails.map(repo.present),
    })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------
// GET /api/notifications/sms/:phone  — Buzón de SMS por teléfono (interno)
// ---------------------------------------------------------------------
async function getSmsByPhone(req, res, next) {
  try {
    const rows = await repo.listByPhone(req.params.phone)
    return res.json({ phone: req.params.phone, count: rows.length, messages: rows.map(repo.present) })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------
// GET /api/notifications/email/:email  — Historial de correos
// ---------------------------------------------------------------------
async function getEmailByAddress(req, res, next) {
  try {
    const rows = await repo.listByEmail(req.params.email)
    return res.json({ email: req.params.email, count: rows.length, emails: rows.map(repo.present) })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------
// GET /api/notifications  — Outbox general (admin)
// ---------------------------------------------------------------------
async function listAll(req, res, next) {
  try {
    const rows = await repo.listAll({
      channel: req.query.channel,
      template: req.query.template,
      limit: Math.min(Number(req.query.limit) || 100, 500),
    })
    return res.json({ count: rows.length, notifications: rows.map(repo.present) })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------
// GET /api/notifications/:id  — Una notificación (con su cuerpo completo)
// ---------------------------------------------------------------------
async function getById(req, res, next) {
  try {
    const row = await repo.findById(req.params.id)
    if (!row) return res.status(404).json({ error: 'notification_not_found' })
    return res.json(repo.present(row))
  } catch (err) {
    return next(err)
  }
}

module.exports = { notify, getMine, getSmsByPhone, getEmailByAddress, listAll, getById }

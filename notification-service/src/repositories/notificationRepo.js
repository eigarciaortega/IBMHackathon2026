/**
 * Acceso a datos de `notifications` (outbox de SMS y correos).
 */
const { query } = require('../config/db')

function present(row) {
  if (!row) return null
  return {
    id: row.id,
    channel: row.channel,
    recipient: row.recipient,
    recipient_name: row.recipient_name,
    template: row.template,
    subject: row.subject,
    body: row.body,
    status: row.status,
    provider: row.provider,
    preview_url: row.preview_url,
    error_message: row.error_message,
    meta: row.meta,
    created_at: row.created_at,
  }
}

/** Guarda una notificación enviada/simulada y devuelve la fila creada. */
async function save(n) {
  const { rows } = await query(
    `INSERT INTO notifications
       (channel, recipient, recipient_name, template, subject, body, status, provider, preview_url, error_message, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      n.channel, n.recipient, n.recipient_name || null, n.template, n.subject || null,
      n.body, n.status, n.provider || null, n.preview_url || null, n.error_message || null,
      n.meta ? JSON.stringify(n.meta) : null,
    ],
  )
  return rows[0]
}

/** Buzón de SMS por teléfono (compara solo los dígitos, ignora formato). */
async function listByPhone(phone, limit = 50) {
  const { rows } = await query(
    `SELECT * FROM notifications
     WHERE channel = 'sms'
       AND regexp_replace(recipient, '\\D', '', 'g') = regexp_replace($1, '\\D', '', 'g')
     ORDER BY created_at DESC, id DESC
     LIMIT $2`,
    [phone, limit],
  )
  return rows
}

/** Historial de correos por dirección (case-insensitive). */
async function listByEmail(email, limit = 50) {
  const { rows } = await query(
    `SELECT * FROM notifications
     WHERE channel = 'email' AND lower(recipient) = lower($1)
     ORDER BY created_at DESC, id DESC
     LIMIT $2`,
    [email, limit],
  )
  return rows
}

/** Listado general (admin) con filtros opcionales. */
async function listAll({ channel, template, limit = 100 } = {}) {
  const conditions = []
  const params = []
  if (channel) {
    params.push(channel)
    conditions.push(`channel = $${params.length}`)
  }
  if (template) {
    params.push(template)
    conditions.push(`template = $${params.length}`)
  }
  params.push(limit)
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const { rows } = await query(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC, id DESC LIMIT $${params.length}`,
    params,
  )
  return rows
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM notifications WHERE id = $1', [id])
  return rows[0] || null
}

module.exports = { present, save, listByPhone, listByEmail, listAll, findById }

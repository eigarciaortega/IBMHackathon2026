/**
 * Plantillas de notificaciones (texto SMS + HTML de correo) en estilo
 * bancario formal: encabezado navy con filo bronce, tipografía serif para
 * títulos, tablas limpias. Sin emojis ni elementos lúdicos.
 *
 * `render(template, data)` es PURO → { sms, subject, html }. `sms` puede ser
 * null si la plantilla es solo-correo (estado de cuenta).
 */

const NAVY = '#0C2340'
const GOLD = '#9C7C46'
const INK = '#16202B'
const MUTED = '#5C6776'
const LINE = '#E6E3DC'
const POS = '#1F6B4A'
const NEG = '#9E2B25'

/** Envoltura HTML bancaria para todos los correos. */
function wrapEmail(title, innerHtml) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eceae3;font-family:Helvetica,Arial,sans-serif;color:${INK};">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border:1px solid ${LINE};border-radius:10px;overflow:hidden;">
      <div style="background:${NAVY};border-top:3px solid ${GOLD};padding:22px 26px;color:#fff;">
        <span style="font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:600;letter-spacing:.3px;">NeoWallet</span>
        <span style="color:#9fb0c6;font-size:11px;letter-spacing:.18em;margin-left:8px;">BANCA DIGITAL</span>
      </div>
      <div style="padding:26px;">
        <h1 style="font-family:Georgia,serif;margin:0 0 14px;font-size:20px;font-weight:600;color:${NAVY};">${title}</h1>
        ${innerHtml}
        <p style="color:${MUTED};font-size:12px;margin-top:24px;border-top:1px solid ${LINE};padding-top:16px;">
          Mensaje automático de NeoWallet · No respondas a este correo.
        </p>
      </div>
    </div>
  </div>
</body></html>`
}

/** Fila clave/valor para los correos transaccionales. */
function kv(k, v, color) {
  return `<tr>
    <td style="padding:9px 0;color:${MUTED};font-size:14px;">${k}</td>
    <td style="padding:9px 0;text-align:right;font-weight:600;font-size:14px;color:${color || INK};">${v}</td>
  </tr>`
}

function statementRows(transactions) {
  if (!transactions || !transactions.length) {
    return `<tr><td colspan="3" style="padding:14px;color:${MUTED};">Sin movimientos en el periodo.</td></tr>`
  }
  const label = { sent: 'Enviado a', received: 'Recibido de', recharge: 'Recarga' }
  return transactions
    .map((t) => {
      const sign = t.type === 'sent' ? '−' : '+'
      const color = t.type === 'sent' ? NEG : POS
      const when = new Date(t.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      const who = t.type === 'recharge' ? (t.counterparty_name || 'Recarga') : `${label[t.type] || ''} ${t.counterparty_name || ''}`
      return `<tr style="border-top:1px solid ${LINE};">
        <td style="padding:11px 6px;font-size:13px;">${who}</td>
        <td style="padding:11px 6px;font-size:13px;color:${MUTED};">${when}</td>
        <td style="padding:11px 6px;text-align:right;font-weight:600;font-size:13px;color:${color};">${sign}$${t.amount_formatted}</td>
      </tr>`
    })
    .join('')
}

function render(template, data = {}) {
  switch (template) {
    case 'recharge':
      return {
        sms: `NeoWallet: Recarga de $${data.amount} por ${data.payment_method} aplicada. Saldo disponible: $${data.new_balance}.`,
        subject: `Recarga confirmada por $${data.amount}`,
        html: wrapEmail(
          'Recarga confirmada',
          `<p style="color:${MUTED};margin:0 0 12px;font-size:14px;">Tu recarga se acreditó correctamente.</p>
           <table style="width:100%;border-collapse:collapse;">
             ${kv('Monto', '+$' + data.amount, POS)}
             ${kv('Método de pago', data.payment_method)}
             ${kv('Nuevo saldo', '$' + data.new_balance, NAVY)}
           </table>`,
        ),
      }
    case 'transfer_sent':
      return {
        sms: `NeoWallet: Enviaste $${data.amount} a ${data.counterparty}. Folio #${data.transaction_id}. Saldo disponible: $${data.new_balance}.`,
        subject: `Comprobante de transferencia · $${data.amount}`,
        html: wrapEmail(
          'Transferencia enviada',
          `<p style="color:${MUTED};margin:0 0 12px;font-size:14px;">Tu transferencia se realizó con éxito.</p>
           <table style="width:100%;border-collapse:collapse;">
             ${kv('Beneficiario', data.counterparty)}
             ${kv('Monto', '−$' + data.amount, NEG)}
             ${kv('Folio', '#' + data.transaction_id)}
             ${kv('Saldo disponible', '$' + data.new_balance, NAVY)}
           </table>`,
        ),
      }
    case 'transfer_received':
      return {
        sms: `NeoWallet: Recibiste $${data.amount} de ${data.counterparty}. Folio #${data.transaction_id}. Saldo disponible: $${data.new_balance}.`,
        subject: `Recibiste un pago de $${data.amount}`,
        html: wrapEmail(
          'Pago recibido',
          `<p style="color:${MUTED};margin:0 0 12px;font-size:14px;">Se acreditó un pago en tu cuenta.</p>
           <table style="width:100%;border-collapse:collapse;">
             ${kv('Origen', data.counterparty)}
             ${kv('Monto', '+$' + data.amount, POS)}
             ${kv('Folio', '#' + data.transaction_id)}
             ${kv('Saldo disponible', '$' + data.new_balance, NAVY)}
           </table>`,
        ),
      }
    case 'statement':
      return {
        sms: null,
        subject: `Estado de cuenta NeoWallet · saldo $${data.balance}`,
        html: wrapEmail(
          'Estado de cuenta',
          `<p style="color:${MUTED};margin:0 0 4px;font-size:13px;">${data.name}</p>
           <div style="background:#F6F4EF;border:1px solid ${LINE};border-radius:8px;padding:16px;margin:6px 0 18px;display:flex;justify-content:space-between;">
             <span style="color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Saldo disponible</span>
             <span style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:${NAVY};">$${data.balance}</span>
           </div>
           <table style="width:100%;border-collapse:collapse;">
             <thead><tr style="color:${MUTED};font-size:11px;text-transform:uppercase;letter-spacing:.06em;">
               <th style="text-align:left;padding:6px;">Concepto</th>
               <th style="text-align:left;padding:6px;">Fecha</th>
               <th style="text-align:right;padding:6px;">Monto</th>
             </tr></thead>
             <tbody>${statementRows(data.transactions)}</tbody>
           </table>`,
        ),
      }
    default:
      return {
        sms: `NeoWallet: ${data.message || 'Notificación'}`,
        subject: 'NeoWallet',
        html: wrapEmail('NeoWallet', `<p>${data.message || 'Notificación'}</p>`),
      }
  }
}

const TEMPLATES = ['recharge', 'transfer_sent', 'transfer_received', 'statement']

module.exports = { render, TEMPLATES, wrapEmail }

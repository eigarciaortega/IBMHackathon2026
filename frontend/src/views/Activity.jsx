/** Actividad: historial de movimientos (RF-005) + envío de estado de cuenta. */
import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Button, Loading, Empty, StatusBadge } from '../components/ui'
import Icon from '../components/icons'
import { money, dateTime } from '../lib/format'
import * as api from '../api/client'

const LABEL = { sent: 'Transferencia enviada', received: 'Transferencia recibida', recharge: 'Recarga' }

export default function Activity() {
  const { toast } = useApp()
  const [data, setData] = useState(null)
  const [filter, setFilter] = useState('all')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api.getHistory().then(setData).catch((e) => {
      setData({ transactions: [] }); toast({ type: 'error', title: 'Error al cargar la actividad', message: e.message })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function sendStatement() {
    setSending(true)
    try {
      const r = await api.emailStatement()
      toast({ type: 'success', title: 'Estado de cuenta enviado', message: `${r.transactions_included} movimientos a ${r.email}` })
    } catch (err) {
      toast({ type: 'error', title: 'No se pudo enviar', message: err.message })
    } finally { setSending(false) }
  }

  if (!data) return <Loading />
  const all = data.transactions || []
  const items = filter === 'all' ? all : all.filter((t) => t.type === filter)

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Historial</div><h1 className="h1">Actividad</h1></div>
        <Button variant="secondary" size="sm" disabled={sending} onClick={sendStatement}>
          <Icon name="file" size="sm" /> {sending ? 'Enviando…' : 'Enviar estado de cuenta'}
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', margin: '14px 0 20px', flexWrap: 'wrap' }}>
        <div className="seg">
          {[['all', 'Todos'], ['sent', 'Enviadas'], ['received', 'Recibidas'], ['recharge', 'Recargas']].map(([v, l]) => (
            <button key={v} className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
      </div>

      <Card style={{ padding: '10px 22px' }}>
        {items.length === 0 ? (
          <Empty icon="activity" title="Sin movimientos" sub="Cuando agregues fondos o transfieras, aparecerán aquí." />
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Concepto</th><th>Beneficiario / Origen</th><th>Fecha</th><th>Estado</th><th style={{ textAlign: 'right' }}>Monto</th></tr></thead>
              <tbody>
                {items.map((t, i) => {
                  const isOut = t.type === 'sent'
                  return (
                    <tr key={i}>
                      <td>{LABEL[t.type] || t.type}</td>
                      <td>{t.counterparty_name || '—'}</td>
                      <td className="num" style={{ color: 'var(--muted)' }}>{dateTime(t.created_at)}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td className="num" style={{ textAlign: 'right', color: t.type === 'sent' ? 'var(--ink)' : 'var(--positive)', fontWeight: 600 }}>
                        {t.status === 'COMPLETED' ? (isOut ? '−' : '+') : ''}{money(t.amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}

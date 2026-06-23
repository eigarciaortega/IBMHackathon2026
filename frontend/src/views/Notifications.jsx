/** Notificaciones: avisos y confirmaciones (SMS) del usuario. */
import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Button, Loading, Empty } from '../components/ui'
import Icon from '../components/icons'
import { dateTime } from '../lib/format'
import * as api from '../api/client'

function iconFor(body = '') {
  const b = body.toLowerCase()
  if (b.includes('enviaste')) return 'send'
  if (b.includes('recibiste')) return 'down'
  if (b.includes('recarga')) return 'plus'
  return 'shield'
}

export default function Notifications() {
  const { toast } = useApp()
  const [items, setItems] = useState(null)

  const load = () => {
    setItems(null)
    api.getMyNotifications()
      .then((r) => setItems(r.sms || []))
      .catch((e) => { setItems([]); toast({ type: 'error', title: 'Error al cargar', message: e.message }) })
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!items) return <Loading />

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Avisos y seguridad</div><h1 className="h1">Notificaciones</h1></div>
        <Button variant="secondary" size="sm" onClick={load}>Actualizar</Button>
      </div>
      <p className="sub">Confirmaciones y alertas de tu cuenta.</p>

      <Card>
        {items.length === 0 ? (
          <Empty icon="bell" title="Sin notificaciones" sub="Tus confirmaciones de movimientos aparecerán aquí." />
        ) : (
          <div className="list">
            {items.map((n) => (
              <div className="row" key={n.id}>
                <span className="tico"><Icon name={iconFor(n.body)} size="sm" /></span>
                <div className="grow">
                  <div className="t">{n.body}</div>
                  <div className="s">{dateTime(n.created_at)} · vía SMS{n.status === 'SIMULATED' ? ' (simulado)' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}

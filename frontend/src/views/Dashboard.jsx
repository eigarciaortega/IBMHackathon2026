/** Resumen: tarjeta de cuenta, accesos rápidos y actividad reciente. */
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Card, Button, Money, StatusBadge, Avatar } from '../components/ui'
import Icon from '../components/icons'
import { money, dateTime, maskAccount } from '../lib/format'
import * as api from '../api/client'

const TYPE = {
  sent: { icon: 'send', label: 'Enviado a', sign: '−' },
  received: { icon: 'down', label: 'Recibido de', sign: '+' },
  recharge: { icon: 'plus', label: 'Recarga', sign: '+' },
}

export default function Dashboard({ setView }) {
  const { user, refreshUser } = useAuth()
  const [history, setHistory] = useState(null)

  useEffect(() => {
    refreshUser()
    let alive = true
    api.getHistory().then((h) => alive && setHistory(h)).catch(() => alive && setHistory({ transactions: [] }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const txs = history?.transactions || []
  const recent = txs.slice(0, 6)
  const sent = txs.filter((t) => t.type === 'sent' && t.status === 'COMPLETED')
  const recv = txs.filter((t) => t.type === 'received' && t.status === 'COMPLETED')
  const recharges = txs.filter((t) => t.type === 'recharge')
  const sum = (arr) => arr.reduce((a, t) => a + Number(t.amount || 0), 0)

  return (
    <>
      <div className="eyebrow">Resumen de cuenta</div>
      <h1 className="h1">Hola, {user?.name?.split(' ')[0]}</h1>
      <p className="sub">Este es el estado actual de tu cuenta.</p>

      <div className="grid g-2">
        <Card className="acct fade">
          <div className="k">Saldo disponible</div>
          <div className="bal num"><span className="cur">$</span>{money(user?.balance).replace('$', '')}</div>
          <div className="meta"><span>Cuenta corriente</span><span>·</span><b className="num">{maskAccount(user)}</b><span>·</span><span>USD</span></div>
          <div className="actions">
            <Button variant="gold" onClick={() => setView('transfer')}><Icon name="send" size="sm" /> Enviar</Button>
            <Button variant="onnavy" onClick={() => setView('recharge')}><Icon name="plus" size="sm" /> Agregar fondos</Button>
            <Button variant="onnavy" onClick={() => setView('statements')}><Icon name="file" size="sm" /> Estados</Button>
          </div>
        </Card>

        <Card className="fade">
          <h3>Este mes</h3>
          <div className="grid g-2e" style={{ gap: 18 }}>
            <div className="stat"><span className="v num" style={{ color: 'var(--positive)' }}>{money(sum(recv))}</span><span className="k">Recibido</span></div>
            <div className="stat"><span className="v num">{money(sum(sent))}</span><span className="k">Enviado</span></div>
            <div className="stat"><span className="v num">{txs.length}</span><span className="k">Movimientos</span></div>
            <div className="stat"><span className="v num">{money(sum(recharges))}</span><span className="k">Recargas</span></div>
          </div>
        </Card>
      </div>

      <Card className="fade" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>Actividad reciente</h3>
          <Button variant="ghost" size="sm" onClick={() => setView('activity')}>Ver toda <Icon name="arrowRight" size="sm" /></Button>
        </div>
        {recent.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>Aún no tienes movimientos. Comienza agregando fondos.</p>
        ) : (
          <div className="list">
            {recent.map((t, i) => {
              const m = TYPE[t.type] || TYPE.received
              return (
                <div className="row" key={i}>
                  <span className="tico"><Icon name={m.icon} size="sm" /></span>
                  <div className="grow">
                    <div className="t">{m.label} {t.counterparty_name}</div>
                    <div className="s">{dateTime(t.created_at)}{t.transaction_id ? ` · folio #${String(t.transaction_id).padStart(4, '0')}` : ''}</div>
                  </div>
                  <StatusBadge status={t.status} />
                  <span className={`amt ${m.sign === '+' ? 'pos' : 'neg'} num`} style={{ marginLeft: 18 }}>{m.sign}{money(t.amount)}</span>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </>
  )
}

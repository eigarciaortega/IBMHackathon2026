/** Agregar fondos (RF-002). */
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { Card, Button, Field, Money } from '../components/ui'
import { money } from '../lib/format'
import * as api from '../api/client'

const METHODS = [
  { v: 'CREDIT_CARD', label: 'Tarjeta de crédito' },
  { v: 'DEBIT_CARD', label: 'Tarjeta de débito' },
  { v: 'BANK_TRANSFER', label: 'Transferencia bancaria' },
  { v: 'CASH', label: 'Efectivo' },
]
const QUICK = [100, 250, 500, 1000]

export default function Recharge() {
  const { user, refreshUser } = useAuth()
  const { toast } = useApp()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('CREDIT_CARD')
  const [busy, setBusy] = useState(false)

  const amt = Number(amount) || 0

  async function submit(e) {
    e.preventDefault()
    if (!(amt > 0)) return toast({ type: 'error', title: 'Monto inválido', message: 'Ingresa un monto mayor a 0' })
    setBusy(true)
    try {
      const r = await api.recharge({ amount: amt, payment_method: method })
      toast({ type: 'success', title: 'Fondos agregados', message: `Nuevo saldo: $${r.new_balance_formatted}` })
      setAmount('')
      await refreshUser()
    } catch (err) {
      toast({ type: 'error', title: 'No se pudo agregar', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Depósito</div><h1 className="h1">Agregar fondos</h1></div>
        <div className="st" style={{ color: 'var(--muted)' }}>Saldo actual: <Money value={user?.balance} /></div>
      </div>
      <p className="sub">Acredita fondos a tu cuenta (simulado, sin cargo real).</p>

      <div className="grid g-2e" style={{ maxWidth: 760 }}>
        <Card className="fade">
          <form onSubmit={submit}>
            <Field label="Monto a agregar">
              <input className="inp amount num" type="number" min="0" step="0.01" inputMode="decimal"
                placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            </Field>
            <div style={{ display: 'flex', gap: 8, flexwrap: 'wrap', marginBottom: 16 }}>
              {QUICK.map((q) => (
                <Button key={q} type="button" variant="secondary" size="sm" onClick={() => setAmount(String(q))}>+{money(q)}</Button>
              ))}
            </div>
            <Field label="Método de pago">
              <select className="inp" value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
              </select>
            </Field>
            <Button block size="lg" disabled={busy}>{busy ? 'Procesando…' : 'Agregar fondos'}</Button>
          </form>
        </Card>

        <Card className="fade">
          <h3 style={{ marginTop: 0 }}>Resumen</h3>
          <div className="kv"><span className="k">Cuenta</span><span>{user?.name}</span></div>
          <div className="kv"><span className="k">Saldo actual</span><span className="num">{money(user?.balance)}</span></div>
          <div className="kv"><span className="k">Vas a agregar</span><span className="num" style={{ color: 'var(--positive)' }}>+{money(amt)}</span></div>
          <div className="kv"><span className="k">Saldo después</span><span className="num"><b>{money(Number(user?.balance || 0) + amt)}</b></span></div>
          <p className="hint" style={{ marginTop: 14 }}>Recibirás una confirmación por SMS y correo. Las verás en Notificaciones y Estados de cuenta.</p>
        </Card>
      </div>
    </>
  )
}

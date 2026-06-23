/** Enviar dinero (RF-003 · Saga): datos → revisar → comprobante. */
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { Card, Button, Field, Money, Avatar, Loading } from '../components/ui'
import Icon from '../components/icons'
import { money, dateTime, maskAccount } from '../lib/format'
import * as api from '../api/client'

export default function Transfer() {
  const { user, refreshUser } = useAuth()
  const { toast } = useApp()
  const [dir, setDir] = useState(null)
  const [receiverId, setReceiverId] = useState('')
  const [amount, setAmount] = useState('')
  const [stepName, setStepName] = useState('form') // form | review | done
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState(null)

  useEffect(() => {
    api.getDirectory()
      .then((list) => {
        const others = list.filter((u) => u.id !== user.id)
        setDir(others)
        if (others[0]) setReceiverId(String(others[0].id))
      })
      .catch((e) => { setDir([]); toast({ type: 'error', title: 'No se pudo cargar el directorio', message: e.message }) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!dir) return <Loading />

  const receiver = dir.find((u) => u.id === Number(receiverId))
  const amt = Number(amount) || 0
  const balance = Number(user?.balance) || 0
  const enough = amt > 0 && amt <= balance

  function toReview(e) {
    e.preventDefault()
    if (!receiver) return toast({ type: 'error', title: 'Elige un beneficiario' })
    if (!enough) return toast({ type: 'error', title: 'Monto inválido', message: amt > balance ? 'Excede tu saldo' : 'Ingresa un monto válido' })
    setStepName('review')
  }

  async function confirm() {
    setBusy(true)
    try {
      const r = await api.transfer({ receiver_id: Number(receiverId), amount: amt })
      setReceipt(r)
      setStepName('done')
      await refreshUser()
    } catch (err) {
      const map = {
        insufficient_funds: 'Saldo insuficiente para esta transferencia',
        self_transfer_not_allowed: 'No puedes transferirte a ti mismo',
        user_not_found: 'El beneficiario no existe',
        transfer_failed_rolled_back: 'No se pudo completar; tu dinero fue devuelto',
      }
      toast({ type: 'error', title: 'Transferencia rechazada', message: map[err.data?.error] || err.message })
      setStepName('form')
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setReceipt(null); setAmount(''); setStepName('form')
  }

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Transferencia</div><h1 className="h1">Enviar dinero</h1></div>
        <div className="st" style={{ color: 'var(--muted)' }}>Saldo disponible: <Money value={user?.balance} /></div>
      </div>
      <p className="sub">Transferencia entre cuentas NeoWallet, sin comisiones.</p>

      <div className="grid g-2e" style={{ maxWidth: 760 }}>
        {/* Paso 1 / 2 */}
        {stepName !== 'done' && (
          <Card className="fade">
            {stepName === 'form' ? (
              <form onSubmit={toReview}>
                <div className="step"><span className="n on">1</span> Datos</div>
                <Field label="Beneficiario">
                  <select className="inp" value={receiverId} onChange={(e) => setReceiverId(e.target.value)}>
                    {dir.length === 0 && <option>No hay beneficiarios</option>}
                    {dir.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
                  </select>
                </Field>
                <Field label="Monto" error={amt > 0 && !enough ? 'El monto supera tu saldo disponible' : ''}>
                  <input className="inp amount num" type="number" min="0" step="0.01" inputMode="decimal"
                    placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
                </Field>
                <Button block size="lg" disabled={!receiver}>Continuar</Button>
              </form>
            ) : (
              <div className="fade">
                <div className="step"><span className="n on">2</span> Revisar</div>
                <div className="kv"><span className="k">Beneficiario</span><span><b>{receiver?.name}</b></span></div>
                <div className="kv"><span className="k">Cuenta</span><span className="num">{maskAccount({ id: receiver?.id })}</span></div>
                <div className="kv"><span className="k">Monto</span><span className="num"><b>{money(amt)}</b></span></div>
                <div className="kv"><span className="k">Comisión</span><span className="num">$0.00</span></div>
                <div className="kv"><span className="k">Saldo posterior</span><span className="num">{money(balance - amt)}</span></div>
                <Button block size="lg" disabled={busy} onClick={confirm} style={{ marginTop: 18 }}>
                  {busy ? 'Procesando…' : 'Confirmar y enviar'}
                </Button>
                <Button block variant="secondary" onClick={() => setStepName('form')} style={{ marginTop: 9 }}>Volver</Button>
              </div>
            )}
          </Card>
        )}

        {/* Paso 3 — comprobante */}
        {stepName === 'done' && receipt && (
          <Card className="fade">
            <div className="receipt-top"><span className="seal"><Icon name="check" /></span> Transferencia realizada</div>
            <div className="kv"><span className="k">Folio</span><span className="num">#{String(receipt.transaction_id).padStart(4, '0')}</span></div>
            <div className="kv"><span className="k">Beneficiario</span><span>{receiver?.name}</span></div>
            <div className="kv"><span className="k">Monto</span><span className="num"><b>{money(receipt.amount)}</b></span></div>
            <div className="kv"><span className="k">Fecha</span><span className="num">{dateTime(new Date())}</span></div>
            <div className="kv"><span className="k">Saldo actual</span><span className="num"><b>{money(receipt.sender_balance)}</b></span></div>
            <Button block onClick={reset} style={{ marginTop: 18 }}>Hacer otra transferencia</Button>
          </Card>
        )}

        {/* Panel lateral: beneficiario */}
        <Card className="fade">
          {receiver ? (
            <>
              <h3 style={{ marginTop: 0 }}>Beneficiario</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <Avatar user={receiver} />
                <div><div style={{ fontWeight: 600 }}>{receiver.name}</div><div className="s" style={{ color: 'var(--muted)' }}>{receiver.email}</div></div>
              </div>
              <p className="hint" style={{ marginTop: 14 }}>
                Protegido por el patrón Saga: si el abono falla, tu dinero se devuelve automáticamente. No se pierde dinero.
              </p>
            </>
          ) : <p style={{ color: 'var(--muted)' }}>No hay beneficiarios disponibles.</p>}
        </Card>
      </div>
    </>
  )
}

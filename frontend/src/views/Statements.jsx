/** Estados de cuenta: correos del usuario + visor + envío de estado de cuenta. */
import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Button, Loading, Empty } from '../components/ui'
import Icon from '../components/icons'
import { dateTime } from '../lib/format'
import * as api from '../api/client'

export default function Statements() {
  const { toast } = useApp()
  const [emails, setEmails] = useState(null)
  const [selected, setSelected] = useState(null)
  const [sending, setSending] = useState(false)

  const load = () =>
    api.getMyNotifications()
      .then((r) => { setEmails(r.emails || []); setSelected((s) => s || (r.emails || [])[0] || null) })
      .catch((e) => { setEmails([]); toast({ type: 'error', title: 'Error al cargar', message: e.message }) })

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendStatement() {
    setSending(true)
    try {
      const r = await api.emailStatement()
      toast({ type: 'success', title: 'Estado de cuenta enviado', message: `${r.transactions_included} movimientos` })
      setTimeout(load, 700)
    } catch (err) {
      toast({ type: 'error', title: 'No se pudo enviar', message: err.message })
    } finally { setSending(false) }
  }

  if (!emails) return <Loading />

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Documentos</div><h1 className="h1">Estados de cuenta</h1></div>
        <Button variant="secondary" size="sm" disabled={sending} onClick={sendStatement}>
          <Icon name="file" size="sm" /> {sending ? 'Enviando…' : 'Enviar estado de cuenta'}
        </Button>
      </div>
      <p className="sub">Comprobantes y estados de cuenta enviados a tu correo.</p>

      {emails.length === 0 ? (
        <Card><Empty icon="file" title="Sin documentos" sub="Genera tu estado de cuenta o realiza un movimiento." /></Card>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 18 }}>
          <Card style={{ padding: 8 }}>
            <div className="list">
              {emails.map((e) => (
                <div className="row" key={e.id} onClick={() => setSelected(e)}
                  style={{ cursor: 'pointer', padding: '12px 10px', borderRadius: 8, background: selected?.id === e.id ? 'rgba(12,35,64,.05)' : 'transparent', borderTop: 'none' }}>
                  <span className="tico"><Icon name="file" size="sm" /></span>
                  <div className="grow">
                    <div className="t" style={{ fontSize: 14 }}>{e.subject}</div>
                    <div className="s">{dateTime(e.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            {selected ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{selected.subject}</div>
                    <div className="s" style={{ color: 'var(--muted)' }}>Para: {selected.recipient} · {dateTime(selected.created_at)}</div>
                  </div>
                  {selected.preview_url && (
                    <a className="btn secondary sm" href={selected.preview_url} target="_blank" rel="noreferrer">Abrir original <Icon name="arrowRight" size="sm" /></a>
                  )}
                </div>
                <iframe title="documento" srcDoc={selected.body} sandbox=""
                  style={{ width: '100%', height: 560, border: '1px solid var(--line-cool)', borderRadius: 8, background: '#fff' }} />
              </>
            ) : <Empty icon="file" title="Elige un documento" />}
          </Card>
        </div>
      )}
    </>
  )
}

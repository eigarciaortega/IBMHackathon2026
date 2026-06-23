/** Componentes de UI reutilizables (banca). */
import { money, initials } from '../lib/format'
import Icon from './icons'

export function Avatar({ user, size = 38, gold = true }) {
  return (
    <div className={`av ${gold ? 'gold' : ''}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials(user?.name)}
    </div>
  )
}

export function Card({ className = '', children, ...rest }) {
  return <div className={`card ${className}`} {...rest}>{children}</div>
}

export function Button({ children, variant = 'primary', size = '', block, ...rest }) {
  return (
    <button className={`btn ${variant} ${size} ${block ? 'block' : ''}`} {...rest}>
      {children}
    </button>
  )
}

export function Field({ label, hint, error, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {error ? <div className="err">{error}</div> : hint ? <div className="hint">{hint}</div> : null}
    </div>
  )
}

export function Money({ value, className = '' }) {
  return <span className={`num ${className}`}>{money(value)}</span>
}

const STATUS = {
  COMPLETED: { cls: 'ok', label: 'Completado' },
  FAILED: { cls: 'bad', label: 'Fallido' },
  ROLLED_BACK: { cls: 'warn', label: 'Revertido' },
  PENDING: { cls: '', label: 'Pendiente' },
  DEBITED: { cls: '', label: 'En proceso' },
}
export function StatusBadge({ status }) {
  const s = STATUS[status] || { cls: '', label: status }
  return <span className={`st ${s.cls}`}><i />{s.label}</span>
}

export function Spinner() { return <span className="spinner" aria-label="cargando" /> }
export function Loading() { return <div className="center"><Spinner /></div> }

export function Empty({ icon = 'file', title = 'Sin información', sub = '' }) {
  return (
    <div className="empty">
      <div className="ei"><Icon name={icon} /></div>
      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
      {sub && <div style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

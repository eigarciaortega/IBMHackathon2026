/** Toasts globales (esquina superior derecha), estilo sobrio. */
import { useApp } from '../context/AppContext'

export default function Toaster() {
  const { toasts, dismiss } = useApp()
  return (
    <div className="toaster">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => dismiss(t.id)} role="status">
          {t.title && <div className="tt">{t.title}</div>}
          {t.message && <div className="tm">{t.message}</div>}
        </div>
      ))}
    </div>
  )
}

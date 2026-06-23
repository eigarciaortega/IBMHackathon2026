import { useSyncExternalStore } from 'react'
import { descartar, instantanea, suscribir } from '../lib/toast'
import { IconAlerta, IconCheck, IconCerrar, IconInfo } from './icons'

const estilos = {
  exito: { clase: 'border-exito/30 bg-exito-soft text-exito', Icono: IconCheck },
  error: { clase: 'border-peligro/30 bg-peligro-soft text-peligro', Icono: IconAlerta },
  info: { clase: 'border-border-strong bg-surface text-body', Icono: IconInfo },
} as const

export function Toaster() {
  const toasts = useSyncExternalStore(suscribir, instantanea, instantanea)

  return (
    <div
      className="fixed bottom-4 right-4 z-[var(--z-toast,60)] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      role="region"
      aria-live="polite"
      aria-label="Notificaciones"
    >
      {toasts.map((t) => {
        const { clase, Icono } = estilos[t.tipo]
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 rounded-[0.625rem] border px-3.5 py-3 shadow-elevada anim-toast ${clase}`}
            role="status"
          >
            <Icono className="mt-0.5 size-[18px] shrink-0" />
            <p className="flex-1 text-sm font-medium leading-snug text-body">{t.mensaje}</p>
            <button
              onClick={() => descartar(t.id)}
              className="shrink-0 rounded p-0.5 text-muted hover:text-body"
              aria-label="Descartar notificación"
            >
              <IconCerrar className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

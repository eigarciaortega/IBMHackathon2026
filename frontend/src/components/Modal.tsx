// Modal accesible: cierra con Escape y clic en el fondo, atrapa el foco inicial y
// bloquea el scroll del fondo. Se monta en un overlay fijo (escapa stacking).
import { useEffect, useRef, type ReactNode } from 'react'
import { IconCerrar } from './icons'

interface Props {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ abierto, onCerrar, titulo, children, footer }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alTeclear)
    document.body.style.overflow = 'hidden'
    // Enfoca el panel al abrir, para lectores de pantalla y teclado.
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = ''
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-ink/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="anim-aparecer flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[var(--radius-lg)] bg-surface shadow-elevada outline-none sm:rounded-[var(--radius-lg)]"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">{titulo}</h2>
          <button onClick={onCerrar} className="btn-ghost btn-sm -mr-2" aria-label="Cerrar">
            <IconCerrar className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2.5 border-t border-border bg-surface-muted px-5 py-4 rounded-b-[var(--radius-lg)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

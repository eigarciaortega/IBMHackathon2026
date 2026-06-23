// Centro de notificaciones del administrador: campana con contador de no leídas y
// un panel desplegable con el historial en tiempo real. Abrir el panel marca todo
// como leído. Se cierra al hacer clic fuera o con Escape.
import { useEffect, useRef, useState } from 'react'
import { useNotificaciones } from '../hooks/useNotificaciones'
import { tiempoRelativo } from '../lib/format'
import { IconCampana } from './icons'
import type { TipoNotificacion } from '../types'

const PUNTO: Record<TipoNotificacion, string> = {
  RESERVA_CREADA: 'bg-exito',
  RESERVA_CANCELADA: 'bg-peligro',
  ESPACIO_CREADO: 'bg-azul',
  ESPACIO_ACTUALIZADO: 'bg-aviso',
  ESPACIO_ELIMINADO: 'bg-peligro',
}

export function NotificacionesMenu() {
  const { notificaciones, noLeidas, conectado, marcarLeidas } = useNotificaciones()
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function alClic(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    function alTecla(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', alClic)
    document.addEventListener('keydown', alTecla)
    return () => {
      document.removeEventListener('mousedown', alClic)
      document.removeEventListener('keydown', alTecla)
    }
  }, [abierto])

  function alternar() {
    const siguiente = !abierto
    setAbierto(siguiente)
    if (siguiente && noLeidas > 0) void marcarLeidas()
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={alternar}
        className="btn-ghost btn-sm relative"
        aria-label={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'}
        aria-haspopup="dialog"
        aria-expanded={abierto}
      >
        <IconCampana className="size-[18px]" />
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-[1.05rem] place-items-center rounded-full bg-peligro px-1 text-[0.65rem] font-semibold leading-[1.05rem] text-white ring-2 ring-surface">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="anim-aparecer absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[0.75rem] border border-border bg-surface shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Notificaciones</h2>
            <span
              className="inline-flex items-center gap-1.5 text-xs text-muted"
              title={conectado ? 'Recibiendo en tiempo real' : 'Sin conexión en tiempo real'}
            >
              <span className={`size-1.5 rounded-full ${conectado ? 'bg-exito' : 'bg-muted/50'}`} />
              {conectado ? 'En vivo' : 'Sin conexión'}
            </span>
          </div>

          {notificaciones.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <IconCampana className="mx-auto size-6 text-muted/60" />
              <p className="mt-2 text-sm text-muted">Sin notificaciones por ahora.</p>
              <p className="mt-0.5 text-xs text-muted/80">
                Te avisaremos cuando haya reservas o cambios en el catálogo.
              </p>
            </div>
          ) : (
            <ul className="max-h-[24rem] divide-y divide-border overflow-y-auto">
              {notificaciones.map((n) => (
                <li key={n.id} className={`flex gap-3 px-4 py-3 ${n.leida ? '' : 'bg-azul-soft/40'}`}>
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${PUNTO[n.tipo]}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-body">{n.mensaje}</p>
                    <p className="mt-0.5 text-xs text-muted">{tiempoRelativo(n.creado_en)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

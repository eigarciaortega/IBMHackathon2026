// Componentes de UI pequeños y reutilizables: spinner, estados vacíos, píldoras.
import type { ReactNode } from 'react'
import type { EstadoReserva, TipoEspacio } from '../types'
import { IconDesk, IconSala } from './icons'

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function CargandoBloque({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted">
      <Spinner className="size-5 text-pino" />
      <span className="text-sm">{texto}</span>
    </div>
  )
}

export function EstadoVacio({
  icono,
  titulo,
  descripcion,
  accion,
}: {
  icono: ReactNode
  titulo: string
  descripcion: string
  accion?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-surface-muted px-6 py-14 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-pino-soft text-pino">
        {icono}
      </div>
      <h3 className="text-base font-semibold text-ink">{titulo}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{descripcion}</p>
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  )
}

export function PillTipo({ tipo }: { tipo: TipoEspacio }) {
  const esSala = tipo === 'SALA'
  return (
    <span className={`pill ${esSala ? 'bg-pino-soft text-pino-strong' : 'bg-ambar-soft text-aviso'}`}>
      {esSala ? <IconSala className="size-3.5" /> : <IconDesk className="size-3.5" />}
      {esSala ? 'Sala' : 'Escritorio'}
    </span>
  )
}

export function PillEstado({ estado }: { estado: EstadoReserva }) {
  const conf =
    estado === 'CONFIRMADA'
      ? { clase: 'bg-exito-soft text-exito', texto: 'Confirmada' }
      : { clase: 'bg-surface-muted text-muted', texto: 'Cancelada' }
  return <span className={`pill ${conf.clase}`}>{conf.texto}</span>
}

export function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">{children}</span>
  )
}

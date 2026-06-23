// Pantalla 3 (parte A): confirmación de reserva. Muestra el resumen (espacio,
// fecha, hora, capacidad), pide el número de asistentes y confirma. Mapea el
// conflicto de horario (409) y la capacidad excedida a mensajes claros.
import { useEffect, useState } from 'react'
import type { Espacio } from '../types'
import { bookingApi } from '../services/booking'
import { ApiError } from '../lib/api'
import { fechaLegible } from '../lib/format'
import { toast } from '../lib/toast'
import { Modal } from './Modal'
import { Spinner } from './ui'
import { IconCalendario, IconReloj, IconUsuarios } from './icons'

interface Props {
  espacio: Espacio | null
  fecha: string
  inicio: string
  fin: string
  onCerrar: () => void
  onReservado: () => void
}

export function ConfirmarReservaModal({ espacio, fecha, inicio, fin, onCerrar, onReservado }: Props) {
  const [asistentes, setAsistentes] = useState('1')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Reinicia el formulario cada vez que cambia el espacio seleccionado.
  useEffect(() => {
    if (espacio) {
      setAsistentes('1')
      setError(null)
      setEnviando(false)
    }
  }, [espacio])

  if (!espacio) return null

  const num = Number(asistentes)
  const excede = num > espacio.capacidad
  const invalido = !num || num < 1 || excede

  async function confirmar() {
    if (invalido || !espacio) return
    setEnviando(true)
    setError(null)
    try {
      await bookingApi.crear({ espacio_id: espacio.id, fecha, hora_inicio: inicio, hora_fin: fin, asistentes: num })
      toast.exito(`Reserva confirmada en ${espacio.nombre}.`)
      onReservado()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.codigo === 'RESERVA_SOLAPADA'
            ? 'Ese horario acaba de ocuparse. Elige otro rango.'
            : err.message,
        )
      } else {
        setError('No se pudo crear la reserva.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      abierto={!!espacio}
      onCerrar={onCerrar}
      titulo="Confirmar reserva"
      footer={
        <>
          <button className="btn-secondary" onClick={onCerrar} disabled={enviando}>Cancelar</button>
          <button className="btn-primary" onClick={confirmar} disabled={invalido || enviando}>
            {enviando ? <Spinner className="size-4" /> : null}
            {enviando ? 'Reservando…' : 'Confirmar reserva'}
          </button>
        </>
      }
    >
      <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted p-4">
        <h3 className="text-base font-semibold text-ink">{espacio.nombre}</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-body">
            <IconCalendario className="size-4 text-muted" />
            <span className="capitalize">{fechaLegible(fecha)}</span>
          </div>
          <div className="flex items-center gap-2 text-body">
            <IconReloj className="size-4 text-muted" />
            <span className="font-mono tabular">{inicio} – {fin}</span>
          </div>
          <div className="flex items-center gap-2 text-body">
            <IconUsuarios className="size-4 text-muted" />
            <span>Capacidad: {espacio.capacidad} personas</span>
          </div>
        </dl>
      </div>

      <div className="mt-4">
        <label htmlFor="asistentes" className="label">Número de asistentes</label>
        <input
          id="asistentes"
          type="number"
          min={1}
          max={espacio.capacidad}
          className="input"
          value={asistentes}
          onChange={(e) => setAsistentes(e.target.value)}
          aria-invalid={invalido}
        />
        {excede && (
          <p className="field-error">Supera la capacidad del espacio ({espacio.capacidad} personas).</p>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-[0.625rem] border border-peligro/30 bg-peligro-soft px-3.5 py-3 text-sm font-medium text-peligro">
          {error}
        </div>
      )}
    </Modal>
  )
}

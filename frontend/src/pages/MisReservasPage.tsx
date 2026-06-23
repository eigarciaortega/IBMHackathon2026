// Pantalla 3 (parte B): Mis Reservas. Historial del usuario con opción de cancelar
// las reservas futuras confirmadas (solo las propias; el backend devuelve 403 si
// se intenta una ajena).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { bookingApi } from '../services/booking'
import { catalogApi } from '../services/catalog'
import type { Espacio, Reserva } from '../types'
import { ApiError } from '../lib/api'
import { fechaLegible, hoyISO } from '../lib/format'
import { useRefrescoAlEnfocar } from '../hooks/useAutoRefresh'
import { toast } from '../lib/toast'
import { CargandoBloque, EstadoVacio, PillEstado } from '../components/ui'
import { Modal } from '../components/Modal'
import { IconCalendario, IconReloj, IconReservas, IconUsuarios } from '../components/icons'
import { Spinner } from '../components/ui'

export function MisReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [espacios, setEspacios] = useState<Record<number, Espacio>>({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aCancelar, setACancelar] = useState<Reserva | null>(null)
  const [cancelando, setCancelando] = useState(false)

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true)
    setError(null)
    try {
      const [misReservas, listaEspacios] = await Promise.all([
        bookingApi.misReservas(),
        catalogApi.listar().catch(() => [] as Espacio[]),
      ])
      const mapa: Record<number, Espacio> = {}
      for (const e of listaEspacios) mapa[e.id] = e
      setEspacios(mapa)
      setReservas(misReservas)
    } catch (err) {
      if (!silencioso) setError(err instanceof ApiError ? err.message : 'No se pudieron cargar tus reservas.')
    } finally {
      if (!silencioso) setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // Refresca al volver a la pestaña (en segundo plano).
  useRefrescoAlEnfocar(() => void cargar(true))

  const hoy = hoyISO()
  const { proximas, pasadas } = useMemo(() => {
    const ordenadas = [...reservas].sort((a, b) =>
      a.fecha === b.fecha ? a.hora_inicio.localeCompare(b.hora_inicio) : a.fecha.localeCompare(b.fecha),
    )
    return {
      proximas: ordenadas.filter((r) => r.fecha >= hoy),
      pasadas: ordenadas.filter((r) => r.fecha < hoy).reverse(),
    }
  }, [reservas, hoy])

  async function confirmarCancelacion() {
    if (!aCancelar) return
    setCancelando(true)
    try {
      await bookingApi.cancelar(aCancelar.id)
      toast.exito('Reserva cancelada. El horario quedó libre.')
      setACancelar(null)
      await cargar()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo cancelar la reserva.')
    } finally {
      setCancelando(false)
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Mis reservas</h1>
        <p className="mt-1 text-sm text-muted">
          Consulta tu historial y cancela reservas futuras cuando lo necesites.
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-4 rounded-[0.625rem] border border-peligro/30 bg-peligro-soft px-4 py-3 text-sm font-medium text-peligro">
          {error}
        </div>
      )}

      {cargando ? (
        <CargandoBloque texto="Cargando tus reservas…" />
      ) : reservas.length === 0 ? (
        <EstadoVacio
          icono={<IconReservas className="size-6" />}
          titulo="Aún no tienes reservas"
          descripcion="Cuando reserves una sala o un escritorio, aparecerá aquí tu historial."
          accion={<Link to="/buscar" className="btn-primary btn-sm">Buscar espacios</Link>}
        />
      ) : (
        <div className="space-y-8">
          <Seccion titulo="Próximas" cantidad={proximas.length}>
            {proximas.length === 0 ? (
              <p className="rounded-[0.625rem] border border-dashed border-border-strong bg-surface-muted px-4 py-6 text-center text-sm text-muted">
                No tienes reservas próximas.
              </p>
            ) : (
              <ul className="space-y-3 anim-lista">
                {proximas.map((r) => (
                  <FilaReserva
                    key={r.id}
                    reserva={r}
                    espacio={espacios[r.espacio_id]}
                    cancelable={r.estado === 'CONFIRMADA'}
                    onCancelar={() => setACancelar(r)}
                  />
                ))}
              </ul>
            )}
          </Seccion>

          {pasadas.length > 0 && (
            <Seccion titulo="Pasadas" cantidad={pasadas.length}>
              <ul className="space-y-3">
                {pasadas.map((r) => (
                  <FilaReserva key={r.id} reserva={r} espacio={espacios[r.espacio_id]} cancelable={false} />
                ))}
              </ul>
            </Seccion>
          )}
        </div>
      )}

      <Modal
        abierto={!!aCancelar}
        onCerrar={() => setACancelar(null)}
        titulo="Cancelar reserva"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setACancelar(null)} disabled={cancelando}>
              Conservar
            </button>
            <button className="btn-danger" onClick={confirmarCancelacion} disabled={cancelando}>
              {cancelando ? <Spinner className="size-4" /> : null}
              {cancelando ? 'Cancelando…' : 'Cancelar reserva'}
            </button>
          </>
        }
      >
        {aCancelar && (
          <p className="text-sm text-body">
            ¿Seguro que quieres cancelar tu reserva de{' '}
            <strong className="text-ink">{espacios[aCancelar.espacio_id]?.nombre ?? 'este espacio'}</strong>{' '}
            el <span className="capitalize">{fechaLegible(aCancelar.fecha)}</span> de{' '}
            <span className="font-mono tabular">{aCancelar.hora_inicio}–{aCancelar.hora_fin}</span>? El
            horario quedará libre para otros.
          </p>
        )}
      </Modal>
    </div>
  )
}

function Seccion({ titulo, cantidad, children }: { titulo: string; cantidad: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{titulo}</h2>
        <span className="font-mono text-sm tabular text-muted">{cantidad}</span>
      </div>
      {children}
    </section>
  )
}

function FilaReserva({
  reserva,
  espacio,
  cancelable,
  onCancelar,
}: {
  reserva: Reserva
  espacio?: Espacio
  cancelable: boolean
  onCancelar?: () => void
}) {
  return (
    <li className="card flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <h3 className="truncate text-base font-semibold text-ink">
            {espacio?.nombre ?? `Espacio #${reserva.espacio_id}`}
          </h3>
          <PillEstado estado={reserva.estado} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1.5 capitalize">
            <IconCalendario className="size-4" /> {fechaLegible(reserva.fecha)}
          </span>
          <span className="flex items-center gap-1.5 font-mono tabular">
            <IconReloj className="size-4" /> {reserva.hora_inicio}–{reserva.hora_fin}
          </span>
          <span className="flex items-center gap-1.5">
            <IconUsuarios className="size-4" /> {reserva.asistentes}
          </span>
        </div>
      </div>
      {cancelable && onCancelar && (
        <button className="btn-danger btn-sm" onClick={onCancelar}>Cancelar</button>
      )}
    </li>
  )
}

// Pantalla 4 (solo ADMINISTRADOR): dashboard de ocupación del día + CRUD de
// espacios con estadísticas básicas. La ocupación viene de booking-service.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { catalogApi } from '../services/catalog'
import { bookingApi } from '../services/booking'
import type { Espacio, Reserva } from '../types'
import { ApiError } from '../lib/api'
import { fechaLegible, hoyISO } from '../lib/format'
import { toast } from '../lib/toast'
import { CargandoBloque, EstadoVacio, PillTipo, Spinner } from '../components/ui'
import { OccupancyTrack } from '../components/OccupancyTrack'
import { EspacioFormModal } from '../components/EspacioFormModal'
import { Modal } from '../components/Modal'
import {
  IconAdmin,
  IconBasura,
  IconCheck,
  IconEditar,
  IconMas,
  IconReloj,
  IconSala,
  IconUsuarios,
} from '../components/icons'

export function AdminPage() {
  const [espacios, setEspacios] = useState<Espacio[]>([])
  const [ocupacion, setOcupacion] = useState<Reserva[]>([])
  const [fecha, setFecha] = useState(hoyISO())
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formAbierto, setFormAbierto] = useState(false)
  const [editando, setEditando] = useState<Espacio | null>(null)
  const [aEliminar, setAEliminar] = useState<Espacio | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const cargarEspacios = useCallback(async () => {
    const lista = await catalogApi.listar()
    setEspacios(lista)
  }, [])

  const cargarOcupacion = useCallback(async (f: string) => {
    const occ = await bookingApi.ocupacion(f)
    setOcupacion(occ)
  }, [])

  const cargarTodo = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      await Promise.all([cargarEspacios(), cargarOcupacion(fecha)])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los datos.')
    } finally {
      setCargando(false)
    }
  }, [cargarEspacios, cargarOcupacion, fecha])

  useEffect(() => {
    void cargarTodo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recarga la ocupación al cambiar la fecha (sin recargar el catálogo).
  useEffect(() => {
    bookingApi.ocupacion(fecha).then(setOcupacion).catch(() => setOcupacion([]))
  }, [fecha])

  const ocupacionPorEspacio = useMemo(() => {
    const mapa: Record<number, Reserva[]> = {}
    for (const r of ocupacion) {
      ;(mapa[r.espacio_id] ??= []).push(r)
    }
    return mapa
  }, [ocupacion])

  const stats = useMemo(() => {
    const salas = espacios.filter((e) => e.tipo === 'SALA').length
    const desks = espacios.length - salas
    const ocupados = new Set(ocupacion.map((r) => r.espacio_id)).size
    const tasa = espacios.length ? Math.round((ocupados / espacios.length) * 100) : 0
    return { salas, desks, ocupados, tasa, total: espacios.length, reservas: ocupacion.length }
  }, [espacios, ocupacion])

  async function confirmarEliminar() {
    if (!aEliminar) return
    setEliminando(true)
    try {
      await catalogApi.eliminar(aEliminar.id)
      toast.exito(`"${aEliminar.nombre}" eliminado.`)
      setAEliminar(null)
      await cargarTodo()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar.')
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Administración</h1>
          <p className="mt-1 text-sm text-muted">Ocupación del día y gestión del catálogo de espacios.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditando(null)
            setFormAbierto(true)
          }}
        >
          <IconMas className="size-[18px]" /> Nuevo espacio
        </button>
      </header>

      {error && (
        <div role="alert" className="mb-4 rounded-[0.625rem] border border-peligro/30 bg-peligro-soft px-4 py-3 text-sm font-medium text-peligro">
          {error}
        </div>
      )}

      {cargando ? (
        <CargandoBloque texto="Cargando panel…" />
      ) : (
        <div className="space-y-8">
          {/* Estadísticas */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat etiqueta="Espacios" valor={stats.total} detalle={`${stats.salas} salas · ${stats.desks} escritorios`} icono={<IconSala className="size-5" />} />
            <Stat etiqueta="Ocupados hoy" valor={stats.ocupados} detalle={`de ${stats.total} espacios`} icono={<IconCheck className="size-5" />} />
            <Stat etiqueta="Reservas del día" valor={stats.reservas} detalle="confirmadas" icono={<IconReloj className="size-5" />} />
            <Stat etiqueta="Tasa de ocupación" valor={`${stats.tasa}%`} detalle="espacios con reserva" icono={<IconAdmin className="size-5" />} acento />
          </section>

          {/* Dashboard de ocupación */}
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Ocupación del día</h2>
              <div className="flex items-center gap-2">
                <label htmlFor="occ-fecha" className="text-sm text-muted">Fecha</label>
                <input
                  id="occ-fecha"
                  type="date"
                  className="input w-auto py-1.5"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
            </div>
            <p className="mb-4 text-sm capitalize text-muted">{fechaLegible(fecha)}</p>

            {espacios.length === 0 ? (
              <EstadoVacio
                icono={<IconSala className="size-6" />}
                titulo="Sin espacios registrados"
                descripcion="Crea el primer espacio para empezar a gestionar reservas."
              />
            ) : (
              <div className="card divide-y divide-border">
                {espacios.map((e) => {
                  const franjas = (ocupacionPorEspacio[e.id] ?? []).map((r) => ({
                    inicio: r.hora_inicio,
                    fin: r.hora_fin,
                    etiqueta: `${r.hora_inicio}–${r.hora_fin} · ${r.usuario_email}`,
                  }))
                  return (
                    <div key={e.id} className="grid items-center gap-3 p-4 sm:grid-cols-[14rem_1fr]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-body">{e.nombre}</span>
                        <span className="font-mono text-xs tabular text-muted">
                          {franjas.length ? `${franjas.length} reserva${franjas.length > 1 ? 's' : ''}` : 'libre'}
                        </span>
                      </div>
                      <OccupancyTrack franjas={franjas} />
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* CRUD de espacios */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-ink">Catálogo de espacios</h2>
            <div className="card overflow-hidden">
              <div className="hidden grid-cols-[1.4fr_0.8fr_0.6fr_1fr_auto] gap-4 border-b border-border bg-surface-muted px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
                <span>Nombre</span>
                <span>Tipo</span>
                <span>Cap.</span>
                <span>Recursos</span>
                <span className="text-right">Acciones</span>
              </div>
              <ul className="divide-y divide-border">
                {espacios.map((e) => (
                  <li key={e.id} className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[1.4fr_0.8fr_0.6fr_1fr_auto] md:items-center md:gap-4">
                    <div className="font-medium text-body">
                      {e.nombre}
                      {e.piso && <span className="ml-2 text-xs text-muted">{e.piso}</span>}
                    </div>
                    <div><PillTipo tipo={e.tipo} /></div>
                    <div className="flex items-center gap-1.5 text-sm text-body">
                      <IconUsuarios className="size-4 text-muted md:hidden" />{e.capacidad}
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-xs text-muted">
                      {e.tiene_proyector && <span className="pill bg-surface-muted text-body">Proyector</span>}
                      {e.tiene_aire && <span className="pill bg-surface-muted text-body">Aire</span>}
                      {!e.tiene_proyector && !e.tiene_aire && <span>—</span>}
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => {
                          setEditando(e)
                          setFormAbierto(true)
                        }}
                        aria-label={`Editar ${e.nombre}`}
                      >
                        <IconEditar className="size-[18px]" />
                      </button>
                      <button
                        className="btn-ghost btn-sm text-peligro hover:bg-peligro-soft"
                        onClick={() => setAEliminar(e)}
                        aria-label={`Eliminar ${e.nombre}`}
                      >
                        <IconBasura className="size-[18px]" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}

      <EspacioFormModal
        abierto={formAbierto}
        espacio={editando}
        onCerrar={() => setFormAbierto(false)}
        onGuardado={() => {
          setFormAbierto(false)
          void cargarTodo()
        }}
      />

      <Modal
        abierto={!!aEliminar}
        onCerrar={() => setAEliminar(null)}
        titulo="Eliminar espacio"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setAEliminar(null)} disabled={eliminando}>
              Conservar
            </button>
            <button className="btn-danger" onClick={confirmarEliminar} disabled={eliminando}>
              {eliminando ? <Spinner className="size-4" /> : null}
              {eliminando ? 'Eliminando…' : 'Eliminar espacio'}
            </button>
          </>
        }
      >
        {aEliminar && (
          <p className="text-sm text-body">
            Vas a eliminar <strong className="text-ink">{aEliminar.nombre}</strong>. Esta acción también
            elimina sus reservas asociadas y no se puede deshacer.
          </p>
        )}
      </Modal>
    </div>
  )
}

function Stat({
  etiqueta,
  valor,
  detalle,
  icono,
  acento,
}: {
  etiqueta: string
  valor: string | number
  detalle: string
  icono: React.ReactNode
  acento?: boolean
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{etiqueta}</span>
        <span className={`grid size-8 place-items-center rounded-full ${acento ? 'bg-ambar-soft text-aviso' : 'bg-pino-soft text-pino'}`}>
          {icono}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-ink tabular">{valor}</p>
      <p className="mt-0.5 text-xs text-muted">{detalle}</p>
    </div>
  )
}

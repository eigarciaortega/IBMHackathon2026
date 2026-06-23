// Pantalla 2: Búsqueda de disponibilidad. El usuario elige fecha y rango horario,
// filtra por tipo y capacidad mínima, y ve solo los espacios disponibles (la
// disponibilidad se calcula consultando booking-service por cada espacio).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { catalogApi } from '../services/catalog'
import { bookingApi } from '../services/booking'
import type { Espacio, Reserva, TipoEspacio } from '../types'
import { ApiError } from '../lib/api'
import { fechaLegible, hoyISO, opcionesHora } from '../lib/format'
import { CargandoBloque, EstadoVacio, Etiqueta, PillTipo } from '../components/ui'
import { OccupancyTrack } from '../components/OccupancyTrack'
import { ConfirmarReservaModal } from '../components/ConfirmarReservaModal'
import { IconAire, IconBuscar, IconPiso, IconProyector, IconReloj, IconUsuarios } from '../components/icons'

interface EspacioConDisponibilidad extends Espacio {
  disponible: boolean
  ocupacion: { inicio: string; fin: string }[]
}

const HORAS = opcionesHora()

export function BuscarPage() {
  const [fecha, setFecha] = useState(hoyISO())
  const [inicio, setInicio] = useState('09:00')
  const [fin, setFin] = useState('10:00')
  const [tipo, setTipo] = useState<TipoEspacio | ''>('')
  const [capacidadMin, setCapacidadMin] = useState('')

  const [resultados, setResultados] = useState<EspacioConDisponibilidad[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [buscado, setBuscado] = useState(false)
  const [seleccion, setSeleccion] = useState<Espacio | null>(null)

  const rangoValido = useMemo(() => inicio < fin, [inicio, fin])

  const buscar = useCallback(async () => {
    if (!rangoValido) {
      setError('La hora de fin debe ser posterior a la de inicio.')
      return
    }
    setError(null)
    setCargando(true)
    setBuscado(true)
    try {
      const espacios = await catalogApi.listar({
        tipo: tipo || undefined,
        capacidadMin: capacidadMin ? Number(capacidadMin) : undefined,
      })

      // Para cada espacio: disponibilidad del rango + ocupación del día (pista).
      const conDatos = await Promise.all(
        espacios.map(async (e) => {
          const [disp, ocupacionDia] = await Promise.all([
            bookingApi.disponibilidad(e.id, fecha, inicio, fin),
            bookingApi.ocupacion(fecha).catch(() => [] as Reserva[]),
          ])
          const ocupacion = ocupacionDia
            .filter((r) => r.espacio_id === e.id)
            .map((r) => ({ inicio: r.hora_inicio, fin: r.hora_fin }))
          return { ...e, disponible: disp.disponible, ocupacion }
        }),
      )
      setResultados(conDatos)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los espacios.')
      setResultados([])
    } finally {
      setCargando(false)
    }
  }, [tipo, capacidadMin, fecha, inicio, fin, rangoValido])

  // Búsqueda inicial al montar.
  useEffect(() => {
    void buscar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const disponibles = resultados.filter((r) => r.disponible)
  const ocupados = resultados.filter((r) => !r.disponible)

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Buscar espacios</h1>
        <p className="mt-1 text-sm text-muted">
          Elige fecha y horario; te mostramos qué salas y escritorios están libres.
        </p>
      </header>

      {/* Barra de filtros */}
      <form
        className="card mb-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_auto] lg:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          void buscar()
        }}
      >
        <div>
          <label htmlFor="fecha" className="label">Fecha</label>
          <input
            id="fecha"
            type="date"
            className="input"
            min={hoyISO()}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="inicio" className="label">Desde</label>
          <select id="inicio" className="select" value={inicio} onChange={(e) => setInicio(e.target.value)}>
            {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="fin" className="label">Hasta</label>
          <select id="fin" className="select" value={fin} onChange={(e) => setFin(e.target.value)}>
            {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="tipo" className="label">Tipo</label>
          <select id="tipo" className="select" value={tipo} onChange={(e) => setTipo(e.target.value as TipoEspacio | '')}>
            <option value="">Todos</option>
            <option value="SALA">Salas</option>
            <option value="DESK">Escritorios</option>
          </select>
        </div>
        <div>
          <label htmlFor="cap" className="label">Capacidad mín.</label>
          <input
            id="cap"
            type="number"
            min={1}
            className="input"
            placeholder="Cualquiera"
            value={capacidadMin}
            onChange={(e) => setCapacidadMin(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary lg:mb-0" disabled={cargando}>
          <IconBuscar className="size-[18px]" />
          Buscar
        </button>
      </form>

      {!rangoValido && (
        <p className="mb-4 text-sm font-medium text-peligro">
          La hora de fin debe ser posterior a la de inicio.
        </p>
      )}
      {error && (
        <div role="alert" className="mb-4 rounded-[0.625rem] border border-peligro/30 bg-peligro-soft px-4 py-3 text-sm font-medium text-peligro">
          {error}
        </div>
      )}

      {cargando ? (
        <CargandoBloque texto="Consultando disponibilidad…" />
      ) : !buscado ? null : resultados.length === 0 ? (
        <EstadoVacio
          icono={<IconBuscar className="size-6" />}
          titulo="Sin espacios que coincidan"
          descripcion="Prueba a relajar los filtros de tipo o capacidad para ver más opciones."
        />
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Disponibles
              </h2>
              <span className="font-mono text-sm tabular text-muted">{disponibles.length}</span>
            </div>
            {disponibles.length === 0 ? (
              <p className="rounded-[0.625rem] border border-dashed border-border-strong bg-surface-muted px-4 py-6 text-center text-sm text-muted">
                Ningún espacio está libre en {fechaLegible(fecha)} de {inicio} a {fin}. Cambia el horario.
              </p>
            ) : (
              <div className="grid gap-3 anim-lista md:grid-cols-2">
                {disponibles.map((e) => (
                  <TarjetaEspacio
                    key={e.id}
                    espacio={e}
                    tentativa={{ inicio, fin }}
                    onReservar={() => setSeleccion(e)}
                  />
                ))}
              </div>
            )}
          </section>

          {ocupados.length > 0 && (
            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Ocupados en ese horario
                </h2>
                <span className="font-mono text-sm tabular text-muted">{ocupados.length}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {ocupados.map((e) => (
                  <TarjetaEspacio key={e.id} espacio={e} tentativa={{ inicio, fin }} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <ConfirmarReservaModal
        espacio={seleccion}
        fecha={fecha}
        inicio={inicio}
        fin={fin}
        onCerrar={() => setSeleccion(null)}
        onReservado={() => {
          setSeleccion(null)
          void buscar()
        }}
      />
    </div>
  )
}

function TarjetaEspacio({
  espacio,
  tentativa,
  onReservar,
}: {
  espacio: EspacioConDisponibilidad
  tentativa: { inicio: string; fin: string }
  onReservar?: () => void
}) {
  return (
    <article className={`card p-4 ${espacio.disponible ? '' : 'opacity-75'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink">{espacio.nombre}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <PillTipo tipo={espacio.tipo} />
            <Etiqueta><IconUsuarios className="size-3.5" /> {espacio.capacidad} pers.</Etiqueta>
            {espacio.piso && <Etiqueta><IconPiso className="size-3.5" /> {espacio.piso}</Etiqueta>}
          </div>
        </div>
        {onReservar ? (
          <button className="btn-primary btn-sm shrink-0" onClick={onReservar}>
            Reservar
          </button>
        ) : (
          <span className="pill shrink-0 bg-surface-muted text-muted">Ocupado</span>
        )}
      </div>

      {(espacio.tiene_proyector || espacio.tiene_aire) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {espacio.tiene_proyector && (
            <span className="pill bg-surface-muted text-body"><IconProyector className="size-3.5" /> Proyector</span>
          )}
          {espacio.tiene_aire && (
            <span className="pill bg-surface-muted text-body"><IconAire className="size-3.5" /> Aire</span>
          )}
        </div>
      )}

      <div className="mt-4">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted">
          <IconReloj className="size-3.5" /> Ocupación del día
        </div>
        <OccupancyTrack franjas={espacio.ocupacion} tentativa={tentativa} />
      </div>
    </article>
  )
}

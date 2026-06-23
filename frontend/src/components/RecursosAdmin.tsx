// Sección de Administración: CRUD del catálogo de recursos (proyector, aire,
// pizarrón...). Es autocontenida: carga su lista y avisa con onCambio cuando algo
// cambia, para que el catálogo de espacios refresque sus etiquetas.
import { useEffect, useState, type FormEvent } from 'react'
import { recursosApi } from '../services/catalog'
import type { Recurso } from '../types'
import { ApiError } from '../lib/api'
import { toast } from '../lib/toast'
import { Modal } from './Modal'
import { CargandoBloque, EstadoVacio, Spinner } from './ui'
import { IconBasura, IconCerrar, IconCheck, IconEditar, IconMas, IconSala } from './icons'

export function RecursosAdmin({ onCambio }: { onCambio?: () => void }) {
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [cargando, setCargando] = useState(true)
  const [nuevo, setNuevo] = useState('')
  const [creando, setCreando] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [aEliminar, setAEliminar] = useState<Recurso | null>(null)
  const [eliminando, setEliminando] = useState(false)

  async function cargar() {
    try {
      setRecursos(await recursosApi.listar())
    } catch {
      // El estado vacío cubre el fallo silenciosamente.
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function crear(e: FormEvent) {
    e.preventDefault()
    if (nuevo.trim() === '') return
    setCreando(true)
    try {
      await recursosApi.crear({ nombre: nuevo.trim() })
      setNuevo('')
      toast.exito('Recurso creado.')
      await cargar()
      onCambio?.()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo crear el recurso.')
    } finally {
      setCreando(false)
    }
  }

  async function guardarEdicion(id: number) {
    if (editNombre.trim() === '') return
    try {
      await recursosApi.actualizar(id, { nombre: editNombre.trim() })
      setEditId(null)
      toast.exito('Recurso actualizado.')
      await cargar()
      onCambio?.()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo actualizar.')
    }
  }

  async function confirmarEliminar() {
    if (!aEliminar) return
    setEliminando(true)
    try {
      await recursosApi.eliminar(aEliminar.id)
      toast.exito(`"${aEliminar.nombre}" eliminado.`)
      setAEliminar(null)
      await cargar()
      onCambio?.()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar.')
    } finally {
      setEliminando(false)
    }
  }

  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold text-ink">Recursos</h2>
      <p className="mb-3 text-sm text-muted">
        Catálogo de equipamiento que puedes asignar a cada espacio.
      </p>

      <div className="card p-4">
        <form onSubmit={crear} className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input"
            placeholder="Nuevo recurso (p. ej. Pizarrón)"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            aria-label="Nombre del nuevo recurso"
          />
          <button type="submit" className="btn-primary shrink-0" disabled={creando || nuevo.trim() === ''}>
            {creando ? <Spinner className="size-4" /> : <IconMas className="size-[18px]" />}
            Agregar
          </button>
        </form>

        <div className="mt-4">
          {cargando ? (
            <CargandoBloque texto="Cargando recursos…" />
          ) : recursos.length === 0 ? (
            <EstadoVacio
              icono={<IconSala className="size-6" />}
              titulo="Sin recursos todavía"
              descripcion="Agrega el primer recurso para poder asignarlo a los espacios."
            />
          ) : (
            <ul className="divide-y divide-border">
              {recursos.map((r) => (
                <li key={r.id} className="flex items-center gap-2 py-2.5">
                  {editId === r.id ? (
                    <>
                      <input
                        className="input flex-1"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void guardarEdicion(r.id)
                          if (e.key === 'Escape') setEditId(null)
                        }}
                        aria-label={`Nuevo nombre para ${r.nombre}`}
                      />
                      <button className="btn-ghost btn-sm text-exito" onClick={() => void guardarEdicion(r.id)} aria-label="Guardar">
                        <IconCheck className="size-[18px]" />
                      </button>
                      <button className="btn-ghost btn-sm" onClick={() => setEditId(null)} aria-label="Cancelar">
                        <IconCerrar className="size-[18px]" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-body">{r.nombre}</span>
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => {
                          setEditId(r.id)
                          setEditNombre(r.nombre)
                        }}
                        aria-label={`Editar ${r.nombre}`}
                      >
                        <IconEditar className="size-[18px]" />
                      </button>
                      <button
                        className="btn-ghost btn-sm text-peligro hover:bg-peligro-soft"
                        onClick={() => setAEliminar(r)}
                        aria-label={`Eliminar ${r.nombre}`}
                      >
                        <IconBasura className="size-[18px]" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal
        abierto={!!aEliminar}
        onCerrar={() => setAEliminar(null)}
        titulo="Eliminar recurso"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setAEliminar(null)} disabled={eliminando}>
              Conservar
            </button>
            <button className="btn-danger" onClick={confirmarEliminar} disabled={eliminando}>
              {eliminando ? <Spinner className="size-4" /> : null}
              {eliminando ? 'Eliminando…' : 'Eliminar recurso'}
            </button>
          </>
        }
      >
        {aEliminar && (
          <p className="text-sm text-body">
            Vas a eliminar <strong className="text-ink">{aEliminar.nombre}</strong>. Se quitará de todos
            los espacios que lo tengan asignado.
          </p>
        )}
      </Modal>
    </section>
  )
}

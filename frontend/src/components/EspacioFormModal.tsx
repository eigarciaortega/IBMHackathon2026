// Formulario de crear/editar espacio (solo ADMINISTRADOR). Reutiliza el mismo
// modal para alta y edición según reciba o no un espacio inicial.
import { useEffect, useState } from 'react'
import type { Espacio, EspacioInput, Recurso, TipoEspacio } from '../types'
import { catalogApi, recursosApi } from '../services/catalog'
import { ApiError } from '../lib/api'
import { toast } from '../lib/toast'
import { Modal } from './Modal'
import { Spinner } from './ui'

interface Props {
  abierto: boolean
  espacio: Espacio | null // null = crear
  onCerrar: () => void
  onGuardado: () => void
}

const VACIO: EspacioInput = {
  nombre: '',
  tipo: 'SALA',
  capacidad: 1,
  piso: '',
  recurso_ids: [],
}

export function EspacioFormModal({ abierto, espacio, onCerrar, onGuardado }: Props) {
  const [form, setForm] = useState<EspacioInput>(VACIO)
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setError(null)
    setGuardando(false)
    recursosApi.listar().then(setRecursos).catch(() => setRecursos([]))
    if (espacio) {
      setForm({
        nombre: espacio.nombre,
        tipo: espacio.tipo,
        capacidad: espacio.capacidad,
        piso: espacio.piso,
        recurso_ids: espacio.recursos.map((r) => r.id),
      })
    } else {
      setForm(VACIO)
    }
  }, [abierto, espacio])

  function alternarRecurso(id: number) {
    setForm((f) => ({
      ...f,
      recurso_ids: f.recurso_ids.includes(id)
        ? f.recurso_ids.filter((x) => x !== id)
        : [...f.recurso_ids, id],
    }))
  }

  const nombreInvalido = form.nombre.trim() === ''
  const capacidadInvalida = !form.capacidad || form.capacidad < 1

  async function guardar() {
    if (nombreInvalido || capacidadInvalida) {
      setError('Revisa el nombre y la capacidad.')
      return
    }
    setGuardando(true)
    setError(null)
    const datos: EspacioInput = { ...form, nombre: form.nombre.trim(), piso: form.piso.trim() }
    try {
      if (espacio) {
        await catalogApi.actualizar(espacio.id, datos)
        toast.exito('Espacio actualizado.')
      } else {
        await catalogApi.crear(datos)
        toast.exito('Espacio creado.')
      }
      onGuardado()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el espacio.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={espacio ? 'Editar espacio' : 'Nuevo espacio'}
      footer={
        <>
          <button className="btn-secondary" onClick={onCerrar} disabled={guardando}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? <Spinner className="size-4" /> : null}
            {espacio ? 'Guardar cambios' : 'Crear espacio'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="e-nombre" className="label">Nombre</label>
          <input
            id="e-nombre"
            className="input"
            placeholder="Sala Monterrey"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            aria-invalid={nombreInvalido}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="e-tipo" className="label">Tipo</label>
            <select
              id="e-tipo"
              className="select"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoEspacio })}
            >
              <option value="SALA">Sala</option>
              <option value="DESK">Escritorio</option>
            </select>
          </div>
          <div>
            <label htmlFor="e-cap" className="label">Capacidad</label>
            <input
              id="e-cap"
              type="number"
              min={1}
              className="input"
              value={form.capacidad}
              onChange={(e) => setForm({ ...form, capacidad: Number(e.target.value) })}
              aria-invalid={capacidadInvalida}
            />
          </div>
        </div>

        <div>
          <label htmlFor="e-piso" className="label">Piso / ubicación</label>
          <input
            id="e-piso"
            className="input"
            placeholder="Piso 1"
            value={form.piso}
            onChange={(e) => setForm({ ...form, piso: e.target.value })}
          />
        </div>

        <fieldset>
          <legend className="label">Recursos</legend>
          {recursos.length === 0 ? (
            <p className="rounded-[0.5rem] border border-dashed border-border-strong bg-surface-muted px-3 py-2.5 text-sm text-muted">
              No hay recursos en el catálogo. Créalos en la sección «Recursos» de Administración.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {recursos.map((r) => (
                <CasillaRecurso
                  key={r.id}
                  etiqueta={r.nombre}
                  activo={form.recurso_ids.includes(r.id)}
                  onChange={() => alternarRecurso(r.id)}
                />
              ))}
            </div>
          )}
        </fieldset>

        {error && (
          <div role="alert" className="rounded-[0.625rem] border border-peligro/30 bg-peligro-soft px-3.5 py-3 text-sm font-medium text-peligro">
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

function CasillaRecurso({
  etiqueta,
  activo,
  onChange,
}: {
  etiqueta: string
  activo: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className={`flex cursor-pointer items-center gap-2.5 rounded-[0.5rem] border px-3 py-2.5 text-sm transition-colors ${
      activo ? 'border-azul bg-azul-soft text-azul-strong' : 'border-border-strong bg-surface text-body hover:bg-surface-muted'
    }`}>
      <input
        type="checkbox"
        className="size-4 accent-[var(--color-azul)]"
        checked={activo}
        onChange={(e) => onChange(e.target.checked)}
      />
      {etiqueta}
    </label>
  )
}

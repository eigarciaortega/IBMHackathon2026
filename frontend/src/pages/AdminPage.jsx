import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { getTodayOccupancy } from '../services/dashboard.service'
import {
  listSpaces,
  createSpace,
  updateSpace,
  deleteSpace,
} from '../services/spaces.service'
import { apiError } from '../services/http'

const EMPTY_FORM = {
  name: '',
  type: 'SALA',
  capacity: 1,
  floor: '',
  has_projector: false,
  has_ac: false,
}

export default function AdminPage() {
  const [dashboard, setDashboard] = useState(null)
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | space object
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [scheduleSpace, setScheduleSpace] = useState(null) // space whose schedule modal is open

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [dash, sp] = await Promise.all([getTodayOccupancy(), listSpaces()])
      setDashboard(dash)
      setSpaces(sp)
    } catch (err) {
      setError(apiError(err, 'No se pudo cargar el panel'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setForm(EMPTY_FORM)
    setEditing('new')
  }

  const openEdit = (space) => {
    setForm({
      name: space.name,
      type: space.type,
      capacity: space.capacity,
      floor: space.floor || '',
      has_projector: space.has_projector,
      has_ac: space.has_ac,
    })
    setEditing(space)
  }

  const closeForm = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, capacity: Number(form.capacity) }
      if (editing === 'new') {
        await createSpace(payload)
      } else {
        await updateSpace(editing.id, payload)
      }
      closeForm()
      await load()
    } catch (err) {
      setError(apiError(err, 'No se pudo guardar el espacio'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (space) => {
    if (!window.confirm(`¿Eliminar "${space.name}"?`)) return
    setError('')
    try {
      await deleteSpace(space.id)
      await load()
    } catch (err) {
      setError(apiError(err, 'No se pudo eliminar el espacio'))
    }
  }

  const setField = (key) => (e) => {
    const value =
      e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-slate-900">Panel de administración</h1>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Cargando…</p>
      ) : (
        <>
          {/* Occupancy summary */}
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Ocupación en este momento
            </h2>
            <p className="mt-1 text-xs text-slate-400">{nowLabel()}</p>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <Stat label="Total" value={dashboard?.summary.total ?? 0} tone="slate" />
              <Stat label="Ocupados ahora" value={dashboard?.summary.occupied ?? 0} tone="indigo" />
              <Stat label="Libres ahora" value={dashboard?.summary.free ?? 0} tone="emerald" />
            </div>

            {/* Per-space occupancy: click a card to see its full schedule */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(dashboard?.spaces ?? []).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScheduleSpace(s)}
                  className={`flex items-center justify-between rounded-lg border p-3 text-left transition hover:shadow-sm ${
                    s.is_occupied_now
                      ? 'border-indigo-200 bg-indigo-50 hover:border-indigo-300'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{s.name}</p>
                    {s.is_occupied_now && s.current_booking ? (
                      <p className="truncate text-xs text-indigo-700">
                        {s.current_booking.user_name} · hasta{' '}
                        {formatTime(s.current_booking.end_time)}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {s.type} · {s.floor || 'Sin piso'} ·{' '}
                        {s.upcoming_count > 0
                          ? `${s.upcoming_count} próxima${s.upcoming_count === 1 ? '' : 's'}`
                          : 'sin reservas'}
                      </p>
                    )}
                  </div>
                  <span
                    className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      s.is_occupied_now
                        ? 'bg-indigo-600 text-white'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {s.is_occupied_now ? 'Ocupada' : 'Libre'}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Spaces management */}
          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Espacios
              </h2>
              <button
                type="button"
                onClick={openNew}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Nuevo espacio
              </button>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Cap.</th>
                    <th className="px-4 py-3 font-medium">Piso</th>
                    <th className="px-4 py-3 font-medium">Equip.</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {spaces.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                      <td className="px-4 py-3 text-slate-700">{s.type}</td>
                      <td className="px-4 py-3 text-slate-700">{s.capacity}</td>
                      <td className="px-4 py-3 text-slate-700">{s.floor || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {[s.has_projector && 'Proyector', s.has_ac && 'A/C']
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(s)}
                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Create / edit modal */}
      {editing && (
        <div className="fixed inset-0 z-10 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-slate-900">
              {editing === 'new' ? 'Nuevo espacio' : 'Editar espacio'}
            </h3>

            <div className="mt-4 space-y-4">
              <Field label="Nombre">
                <input
                  required
                  value={form.name}
                  onChange={setField('name')}
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Tipo">
                  <select value={form.type} onChange={setField('type')} className={inputClass}>
                    <option value="SALA">Sala</option>
                    <option value="DESK">Escritorio</option>
                  </select>
                </Field>
                <Field label="Capacidad">
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.capacity}
                    onChange={setField('capacity')}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Piso">
                <input value={form.floor} onChange={setField('floor')} className={inputClass} />
              </Field>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.has_projector}
                    onChange={setField('has_projector')}
                  />
                  Proyector
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.has_ac} onChange={setField('has_ac')} />
                  Aire acondicionado
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Space schedule modal */}
      {scheduleSpace && (
        <ScheduleModal space={scheduleSpace} onClose={() => setScheduleSpace(null)} />
      )}
    </Layout>
  )
}

function ScheduleModal({ space, onClose }) {
  const bookings = space.bookings ?? []
  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{space.name}</h3>
            <p className="text-sm text-slate-500">
              {space.type} · {space.floor || 'Sin piso'} · capacidad {space.capacity}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              space.is_occupied_now
                ? 'bg-indigo-600 text-white'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {space.is_occupied_now ? 'Ocupada ahora' : 'Libre ahora'}
          </span>
        </div>

        <h4 className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Horarios reservados
        </h4>

        {bookings.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No hay reservas activas ni próximas para este espacio.
          </p>
        ) : (
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {bookings.map((b) => (
              <li
                key={b.id}
                className={`rounded-lg border p-3 ${
                  b.is_active_now
                    ? 'border-indigo-200 bg-indigo-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-900">{formatRange(b)}</p>
                  {b.is_active_now && (
                    <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                      En curso
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {b.user_name} · {b.attendees} asistente{b.attendees === 1 ? '' : 's'}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

// Current date/time label, e.g. "domingo, 22 jun 2026, 23:05"
function nowLabel() {
  return new Date().toLocaleString('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Time only, e.g. "10:00"
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Full date + time range for a booking, e.g. "23 jun, 09:00 – 10:00"
function formatRange(b) {
  const day = new Date(b.start_time).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
  })
  return `${day}, ${formatTime(b.start_time)} – ${formatTime(b.end_time)}`
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function Stat({ label, value, tone }) {
  const tones = {
    slate: 'text-slate-900',
    indigo: 'text-indigo-600',
    emerald: 'text-emerald-600',
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  )
}

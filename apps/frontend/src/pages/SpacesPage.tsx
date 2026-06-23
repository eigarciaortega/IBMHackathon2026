import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { resourcesService, spacesService } from '../services';
import { Spinner } from '../components/Spinner';
import { EmptyState, ErrorMessage } from '../components/ErrorMessage';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage } from '../lib/api';
import { Space } from '../types';

interface SpaceForm {
  id?: string;
  name: string;
  spaceType: string;
  capacity: string;
  floor: string;
  zone: string;
  description: string;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE';
  resourceIds: string[];
}

const EMPTY_FORM: SpaceForm = {
  name: '',
  spaceType: '',
  capacity: '',
  floor: '',
  zone: '',
  description: '',
  status: 'AVAILABLE',
  resourceIds: [],
};

export function SpacesPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();

  // Filtros
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [floor, setFloor] = useState('');
  const [zone, setZone] = useState('');
  const [status, setStatus] = useState('');
  const [resource, setResource] = useState('');

  // Modales
  const [form, setForm] = useState<SpaceForm | null>(null);
  const [toDelete, setToDelete] = useState<Space | null>(null);
  const [toMaintenance, setToMaintenance] = useState<Space | null>(null);
  const [resourceModal, setResourceModal] = useState(false);
  const [newResource, setNewResource] = useState({ name: '', description: '' });

  const { data, isLoading, error } = useQuery({
    queryKey: ['spaces', { type, capacity, floor, zone, status, resource }],
    queryFn: () =>
      spacesService.list({
        type: type || undefined,
        capacity: capacity || undefined,
        floor: floor || undefined,
        zone: zone || undefined,
        status: status || undefined,
        resource: resource || undefined,
        limit: 100,
      }),
  });

  const resourcesQ = useQuery({ queryKey: ['resources'], queryFn: () => resourcesService.list({ limit: 100 }) });

  const items = useMemo(() => {
    const list = data?.items ?? [];
    const q = name.trim().toLowerCase();
    return q ? list.filter((s) => s.name.toLowerCase().includes(q)) : list;
  }, [data, name]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['spaces'] });
  const onErr = (e: unknown) => toast.error(getApiErrorMessage(e));

  const saveMutation = useMutation({
    mutationFn: async (f: SpaceForm) => {
      const body = {
        name: f.name,
        spaceType: f.spaceType,
        capacity: Number(f.capacity),
        floor: f.floor,
        zone: f.zone,
        description: f.description || undefined,
        resourceIds: f.resourceIds,
      };
      if (f.id) return spacesService.update(f.id, body);
      return spacesService.create({ ...body, status: f.status });
    },
    onSuccess: (_d, f) => {
      toast.success(f.id ? 'Espacio actualizado.' : 'Espacio creado.');
      setForm(null);
      void invalidate();
    },
    onError: onErr,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => spacesService.changeStatus(id, status),
    onSuccess: (_d, v) => {
      toast.success(
        v.status === 'MAINTENANCE'
          ? 'Sala puesta en mantenimiento.'
          : v.status === 'INACTIVE'
            ? 'Sala desactivada.'
            : 'Sala activada.',
      );
      setToMaintenance(null);
      void invalidate();
    },
    onError: onErr,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => spacesService.remove(id),
    onSuccess: () => {
      toast.success('Espacio eliminado (desactivado).');
      setToDelete(null);
      void invalidate();
    },
    onError: onErr,
  });

  const createResourceMutation = useMutation({
    mutationFn: () => resourcesService.create({ name: newResource.name, description: newResource.description || undefined }),
    onSuccess: () => {
      toast.success('Recurso creado.');
      setNewResource({ name: '', description: '' });
      setResourceModal(false);
      void qc.invalidateQueries({ queryKey: ['resources'] });
    },
    onError: onErr,
  });

  const openCreate = () => setForm({ ...EMPTY_FORM });
  const openEdit = (s: Space) =>
    setForm({
      id: s.id,
      name: s.name,
      spaceType: s.spaceType,
      capacity: String(s.capacity),
      floor: s.floor,
      zone: s.zone,
      description: s.description ?? '',
      status: (s.status as SpaceForm['status']) ?? 'AVAILABLE',
      resourceIds: s.spaceResources?.map((r) => r.resource.id) ?? [],
    });

  const formValid = form && form.name.trim() && form.spaceType.trim() && Number(form.capacity) > 0 && form.floor.trim() && form.zone.trim();

  return (
    <div>
      <PageHeader
        title={isAdmin ? 'Gestión de Espacios' : 'Espacios'}
        subtitle={isAdmin ? 'Administra salas, estados y recursos' : 'Encuentra y reserva el espacio ideal'}
      />

      {/* Toolbar admin */}
      {isAdmin && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-graphite-500">{items.length} espacios</p>
          <div className="flex gap-2">
            <button onClick={() => setResourceModal(true)} className="btn btn-secondary">
              + Nuevo recurso
            </button>
            <button onClick={openCreate} className="btn btn-primary">
              + Nuevo espacio
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card card-pad mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} className="input" />
        <input placeholder="Tipo" value={type} onChange={(e) => setType(e.target.value)} className="input" />
        <input placeholder="Capacidad mín." type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="input" />
        <input placeholder="Piso" value={floor} onChange={(e) => setFloor(e.target.value)} className="input" />
        <input placeholder="Zona" value={zone} onChange={(e) => setZone(e.target.value)} className="input" />
        <select value={resource} onChange={(e) => setResource(e.target.value)} className="select">
          <option value="">Cualquier recurso</option>
          {resourcesQ.data?.items.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {isAdmin && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="select">
            <option value="">Todos los estados</option>
            <option value="AVAILABLE">Disponible</option>
            <option value="MAINTENANCE">Mantenimiento</option>
            <option value="INACTIVE">Inactiva</option>
          </select>
        )}
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorMessage message={getApiErrorMessage(error)} />}
      {data && items.length === 0 && <EmptyState message="No hay espacios que coincidan con los filtros." />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((s) => (
          <div key={s.id} className="card card-hover animate-fade-up flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-graphite-900">{s.name}</h3>
                <p className="mt-0.5 text-sm text-graphite-500">{s.spaceType}</p>
              </div>
              <StatusBadge status={s.status} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-graphite-50 py-2">
                <div className="text-sm font-semibold text-graphite-900">{s.capacity}</div>
                <div className="text-[10px] uppercase tracking-wide text-graphite-400">personas</div>
              </div>
              <div className="rounded-lg bg-graphite-50 py-2">
                <div className="truncate px-1 text-sm font-semibold text-graphite-900">{s.floor}</div>
                <div className="text-[10px] uppercase tracking-wide text-graphite-400">piso</div>
              </div>
              <div className="rounded-lg bg-graphite-50 py-2">
                <div className="truncate px-1 text-sm font-semibold text-graphite-900">{s.zone}</div>
                <div className="text-[10px] uppercase tracking-wide text-graphite-400">zona</div>
              </div>
            </div>

            {s.spaceResources && s.spaceResources.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.spaceResources.map((r) => (
                  <span key={r.resource.id} className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                    {r.resource.name}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto pt-4">
              {isAdmin ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="btn btn-secondary btn-sm flex-1">
                      Editar
                    </button>
                    {s.status !== 'AVAILABLE' ? (
                      <button
                        onClick={() => statusMutation.mutate({ id: s.id, status: 'AVAILABLE' })}
                        className="btn btn-ghost btn-sm flex-1 text-emerald-700"
                      >
                        Activar
                      </button>
                    ) : (
                      <button
                        onClick={() => setToMaintenance(s)}
                        className="btn btn-ghost btn-sm flex-1 text-amber-700"
                      >
                        Mantenimiento
                      </button>
                    )}
                    <button onClick={() => setToDelete(s)} className="btn btn-ghost btn-sm text-rose-600">
                      Eliminar
                    </button>
                  </div>
                  {s.status === 'AVAILABLE' && (
                    <Link to={`/spaces/${s.id}/reserve`} className="btn btn-primary btn-sm w-full">
                      Reservar →
                    </Link>
                  )}
                </div>
              ) : s.status === 'AVAILABLE' ? (
                <Link to={`/spaces/${s.id}/reserve`} className="btn btn-primary w-full">
                  Reservar →
                </Link>
              ) : (
                <button disabled className="btn btn-secondary w-full">
                  No disponible
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal crear/editar espacio */}
      {form && (
        <Modal title={form.id ? 'Editar espacio' : 'Nuevo espacio'} onClose={() => setForm(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nombre *">
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Tipo *">
                <input className="input" value={form.spaceType} onChange={(e) => setForm({ ...form, spaceType: e.target.value })} />
              </Field>
              <Field label="Capacidad *">
                <input type="number" min={1} className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </Field>
              {!form.id && (
                <Field label="Estado inicial">
                  <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SpaceForm['status'] })}>
                    <option value="AVAILABLE">Disponible</option>
                    <option value="MAINTENANCE">Mantenimiento</option>
                    <option value="INACTIVE">Inactiva</option>
                  </select>
                </Field>
              )}
              <Field label="Piso *">
                <input className="input" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
              </Field>
              <Field label="Zona *">
                <input className="input" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
              </Field>
            </div>
            <Field label="Descripción">
              <textarea className="input min-h-[72px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Recursos asignados">
              <div className="flex flex-wrap gap-2">
                {resourcesQ.data?.items.length === 0 && <span className="text-sm text-graphite-400">No hay recursos. Crea uno primero.</span>}
                {resourcesQ.data?.items.map((r) => {
                  const on = form.resourceIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          resourceIds: on ? form.resourceIds.filter((x) => x !== r.id) : [...form.resourceIds, r.id],
                        })
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition ${
                        on ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white text-graphite-600 ring-graphite-200 hover:bg-graphite-50'
                      }`}
                    >
                      {r.name}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setForm(null)} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              onClick={() => form && saveMutation.mutate(form)}
              disabled={!formValid || saveMutation.isPending}
              className="btn btn-primary"
            >
              {saveMutation.isPending ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear espacio'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal nuevo recurso */}
      {resourceModal && (
        <Modal title="Nuevo recurso" onClose={() => setResourceModal(false)}>
          <div className="space-y-3">
            <Field label="Nombre *">
              <input className="input" value={newResource.name} onChange={(e) => setNewResource({ ...newResource, name: e.target.value })} />
            </Field>
            <Field label="Descripción">
              <input className="input" value={newResource.description} onChange={(e) => setNewResource({ ...newResource, description: e.target.value })} />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setResourceModal(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              onClick={() => createResourceMutation.mutate()}
              disabled={!newResource.name.trim() || createResourceMutation.isPending}
              className="btn btn-primary"
            >
              {createResourceMutation.isPending ? 'Creando…' : 'Crear recurso'}
            </button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!toMaintenance}
        title="Poner en mantenimiento"
        description={
          toMaintenance
            ? `La sala "${toMaintenance.name}" no podrá reservarse mientras esté en mantenimiento. Las reservas futuras activas bloquean este cambio.`
            : ''
        }
        confirmLabel="Sí, mantenimiento"
        loading={statusMutation.isPending}
        onConfirm={() => toMaintenance && statusMutation.mutate({ id: toMaintenance.id, status: 'MAINTENANCE' })}
        onCancel={() => setToMaintenance(null)}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar espacio"
        description={
          toDelete
            ? `¿Eliminar "${toDelete.name}"? Se desactivará (borrado lógico). Si tiene reservas futuras confirmadas, el sistema lo impedirá; usa Mantenimiento o cancela esas reservas primero.`
            : ''
        }
        confirmLabel="Sí, eliminar"
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-graphite-600">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-graphite-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-lift animate-fade-up sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-graphite-900">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-graphite-400 hover:bg-graphite-100" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

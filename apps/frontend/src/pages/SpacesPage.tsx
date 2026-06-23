import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { spacesService } from '../services';
import { Spinner } from '../components/Spinner';
import { EmptyState, ErrorMessage } from '../components/ErrorMessage';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/PageHeader';
import { getApiErrorMessage } from '../lib/api';

export function SpacesPage() {
  const [type, setType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [zone, setZone] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['spaces', { type, capacity, zone }],
    queryFn: () =>
      spacesService.list({
        type: type || undefined,
        capacity: capacity || undefined,
        zone: zone || undefined,
        limit: 50,
      }),
  });

  return (
    <div>
      <PageHeader title="Espacios" subtitle="Encuentra y reserva el espacio ideal" />

      <div className="card card-pad mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input placeholder="Tipo de espacio" value={type} onChange={(e) => setType(e.target.value)} className="input" />
        <input placeholder="Capacidad mínima" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="input" />
        <input placeholder="Zona" value={zone} onChange={(e) => setZone(e.target.value)} className="input" />
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorMessage message={getApiErrorMessage(error)} />}
      {data && data.items.length === 0 && (
        <EmptyState message="No hay espacios que coincidan con los filtros. Ajusta la búsqueda." />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {data?.items.map((s) => (
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
              {s.status === 'AVAILABLE' ? (
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
    </div>
  );
}

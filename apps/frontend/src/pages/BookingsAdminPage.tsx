import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '../services';
import { Spinner } from '../components/Spinner';
import { EmptyState, ErrorMessage } from '../components/ErrorMessage';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { getApiErrorMessage } from '../lib/api';
import { Booking } from '../types';

export function BookingsAdminPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-bookings', { date, status }],
    queryFn: () =>
      bookingsService.list({ date: date || undefined, status: status || undefined, limit: 50 }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-bookings'] });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsService.cancel(id),
    onSuccess: () => {
      setToCancel(null);
      void invalidate();
    },
    onError: (e) => setActionError(getApiErrorMessage(e)),
  });

  const noShowMutation = useMutation({
    mutationFn: (id: string) => bookingsService.noShow(id),
    onSuccess: () => void invalidateAll(),
    onError: (e) => setActionError(getApiErrorMessage(e)),
  });

  const attendedMutation = useMutation({
    mutationFn: (id: string) => bookingsService.attended(id),
    onSuccess: () => void invalidateAll(),
    onError: (e) => setActionError(getApiErrorMessage(e)),
  });

  const verifyQuery = useQuery({ queryKey: ['to-verify'], queryFn: bookingsService.toVerify });

  function invalidateAll() {
    void invalidate();
    void qc.invalidateQueries({ queryKey: ['to-verify'] });
  }

  return (
    <div>
      <PageHeader title="Reservas (Admin)" subtitle="Gestiona todas las reservas del sistema" />
      <ErrorMessage message={actionError} />

      {/* Control de Asistencia — Reservas por verificar */}
      <div className="card card-pad mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Reservas por verificar</h2>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
            {verifyQuery.data?.length ?? 0} pendientes
          </span>
        </div>
        {verifyQuery.isLoading && <Spinner />}
        {verifyQuery.data && verifyQuery.data.length === 0 && (
          <EmptyState message="No hay reservas finalizadas pendientes de verificar." />
        )}
        {verifyQuery.data && verifyQuery.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Espacio</th>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th className="text-right">Verificar</th>
                </tr>
              </thead>
              <tbody>
                {verifyQuery.data.map((b) => (
                  <tr key={b.id}>
                    <td>{b.user?.email ?? b.userId}</td>
                    <td className="font-medium text-slate-800">{b.space?.name ?? b.spaceId}</td>
                    <td>{b.bookingDate}</td>
                    <td>
                      {b.startTime}–{b.endTime}
                    </td>
                    <td className="space-x-1 text-right">
                      <button
                        onClick={() => attendedMutation.mutate(b.id)}
                        className="btn btn-ghost btn-sm text-emerald-700"
                      >
                        Asistió
                      </button>
                      <button
                        onClick={() => noShowMutation.mutate(b.id)}
                        className="btn btn-ghost btn-sm text-orange-600"
                      >
                        No asistió
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card card-pad mb-6 flex flex-wrap gap-3">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input sm:w-auto" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="select sm:w-auto">
          <option value="">Todos los estados</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="NO_SHOW">NO_SHOW</option>
        </select>
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorMessage message={getApiErrorMessage(error)} />}
      {data && data.items.length === 0 && <EmptyState message="No hay reservas para los filtros seleccionados." />}

      {data && data.items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Espacio</th>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((b) => (
                  <tr key={b.id}>
                    <td>{b.user?.email ?? b.userId}</td>
                    <td className="font-medium text-slate-800">{b.space?.name ?? b.spaceId}</td>
                    <td>{b.bookingDate}</td>
                    <td>
                      {b.startTime}–{b.endTime}
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="space-x-1 text-right">
                      {b.status === 'CONFIRMED' && (
                        <>
                          <button onClick={() => setToCancel(b)} className="btn btn-ghost btn-sm text-red-600">
                            Cancelar
                          </button>
                          <button
                            onClick={() => noShowMutation.mutate(b.id)}
                            className="btn btn-ghost btn-sm text-orange-600"
                          >
                            NO_SHOW
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toCancel}
        title="Cancelar reserva"
        description={toCancel ? `¿Cancelar la reserva de ${toCancel.user?.email ?? ''}?` : ''}
        confirmLabel="Sí, cancelar"
        loading={cancelMutation.isPending}
        onConfirm={() => toCancel && cancelMutation.mutate(toCancel.id)}
        onCancel={() => setToCancel(null)}
      />
    </div>
  );
}

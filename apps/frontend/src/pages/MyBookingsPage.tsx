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

export function MyBookingsPage() {
  const qc = useQueryClient();
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: bookingsService.myBookings,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsService.cancel(id),
    onSuccess: () => {
      setToCancel(null);
      void qc.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (e) => setActionError(getApiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader title="Mis Reservas" subtitle="Tus reservas y su estado" />
      <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2 text-sm text-brand-800">
        Tu asistencia puede ser verificada por el gestor al finalizar tu reserva.
      </div>
      <ErrorMessage message={actionError} />
      {isLoading && <Spinner />}
      {error && <ErrorMessage message={getApiErrorMessage(error)} />}
      {data && data.length === 0 && <EmptyState message="No tienes reservas todavía." />}

      {data && data.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Espacio</th>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((b) => (
                  <tr key={b.id}>
                    <td className="font-medium text-slate-800">{b.space?.name ?? b.spaceId}</td>
                    <td>{b.bookingDate}</td>
                    <td>
                      {b.startTime}–{b.endTime}
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="text-right">
                      {b.status === 'CONFIRMED' && (
                        <button onClick={() => setToCancel(b)} className="btn btn-ghost btn-sm text-red-600">
                          Cancelar
                        </button>
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
        description={
          toCancel ? `¿Cancelar la reserva de "${toCancel.space?.name}" el ${toCancel.bookingDate}?` : ''
        }
        confirmLabel="Sí, cancelar"
        loading={cancelMutation.isPending}
        onConfirm={() => toCancel && cancelMutation.mutate(toCancel.id)}
        onCancel={() => setToCancel(null)}
      />
    </div>
  );
}

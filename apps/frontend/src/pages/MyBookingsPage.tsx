import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '../services';
import { Spinner } from '../components/Spinner';
import { EmptyState, ErrorMessage } from '../components/ErrorMessage';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { getApiErrorMessage } from '../lib/api';
import { Booking } from '../types';

/** Construye un enlace de Google Calendar (sin credenciales) para una reserva. */
function googleCalendarUrl(b: Booking): string {
  const compact = (date: string, time: string) =>
    `${date.replace(/-/g, '')}T${time.replace(/:/g, '').slice(0, 6).padEnd(6, '0')}`;
  const start = compact(b.bookingDate, b.startTime);
  const end = compact(b.bookingDate, b.endTime);
  const text = `Reserva: ${b.space?.name ?? 'Espacio'}`;
  const location = [b.space?.name, b.space?.floor, b.space?.zone].filter(Boolean).join(', ');
  const details = b.purpose ? `Motivo: ${b.purpose}` : 'Reserva de espacio en OfficeSpace.';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text,
    dates: `${start}/${end}`,
    details,
    location,
    ctz: 'America/Mexico_City',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function MyBookingsPage() {
  const qc = useQueryClient();
  const location = useLocation();
  const navMsg = (location.state as { msg?: string } | null)?.msg ?? null;
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: bookingsService.myBookings,
  });

  const toast = useToast();
  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsService.cancel(id),
    onSuccess: () => {
      setToCancel(null);
      toast.success('Reserva cancelada.');
      void qc.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (e) => {
      const m = getApiErrorMessage(e);
      setActionError(m);
      toast.error(m);
    },
  });

  return (
    <div>
      <PageHeader title="Mis Reservas" subtitle="Tus reservas y su estado" />
      {navMsg && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {navMsg}
        </div>
      )}
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
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {(b.status === 'CONFIRMED' || b.status === 'ATTENDED') && (
                          <>
                            <a
                              href={googleCalendarUrl(b)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-sm text-teal-700"
                              title="Abrir Google Calendar con el evento prellenado"
                            >
                              Google Calendar
                            </a>
                            <button
                              onClick={() =>
                                void bookingsService.downloadIcs(b.id, `reserva-${b.space?.name ?? 'espacio'}`)
                              }
                              className="btn btn-ghost btn-sm text-graphite-600"
                              title="Descargar evento .ics"
                            >
                              .ics
                            </button>
                          </>
                        )}
                        {b.status === 'CONFIRMED' && (
                          <button onClick={() => setToCancel(b)} className="btn btn-ghost btn-sm text-rose-600">
                            Cancelar
                          </button>
                        )}
                        {b.status === 'PENDING_APPROVAL' && (
                          <span className="text-xs text-amber-700">Esperando aprobación del administrador</span>
                        )}
                      </div>
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

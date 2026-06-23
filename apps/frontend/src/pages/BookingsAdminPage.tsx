import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '../services';
import { Spinner } from '../components/Spinner';
import { EmptyState, ErrorMessage } from '../components/ErrorMessage';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../lib/api';
import { Booking } from '../types';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function isFuture(b: Booking): boolean {
  const t = todayISO();
  if (b.bookingDate > t) return true;
  return b.bookingDate === t && (b.startTime ?? '').slice(0, 5) > nowHHMM();
}

export function BookingsAdminPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const [toRelease, setToRelease] = useState<Booking | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-bookings', { date, status }],
    queryFn: () =>
      bookingsService.list({ date: date || undefined, status: status || undefined, limit: 50 }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-bookings'] });

  const onErr = (e: unknown) => {
    const m = getApiErrorMessage(e);
    setActionError(m);
    toast.error(m);
  };

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsService.cancel(id),
    onSuccess: () => {
      setToCancel(null);
      toast.success('Reserva cancelada.');
      void invalidateAll();
    },
    onError: onErr,
  });

  const releaseMutation = useMutation({
    mutationFn: (id: string) => bookingsService.release(id),
    onSuccess: () => {
      setToRelease(null);
      toast.success('Espacio liberado. La reserva fue cancelada.');
      void invalidateAll();
    },
    onError: onErr,
  });

  const noShowMutation = useMutation({
    mutationFn: (id: string) => bookingsService.noShow(id),
    onSuccess: () => {
      toast.warning('Reserva marcada como NO_SHOW.');
      void invalidateAll();
    },
    onError: onErr,
  });

  const attendedMutation = useMutation({
    mutationFn: (id: string) => bookingsService.attended(id),
    onSuccess: () => {
      toast.success('Asistencia verificada.');
      void invalidateAll();
    },
    onError: onErr,
  });

  const verifyQuery = useQuery({ queryKey: ['to-verify'], queryFn: bookingsService.toVerify });
  const pendingQuery = useQuery({ queryKey: ['pending-approvals'], queryFn: bookingsService.pending });

  const approveMutation = useMutation({
    mutationFn: (id: string) => bookingsService.approve(id),
    onSuccess: () => {
      toast.success('Reserva recurrente aprobada.');
      void invalidateAll();
    },
    onError: onErr,
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => bookingsService.reject(id),
    onSuccess: () => {
      toast.info('Solicitud recurrente rechazada.');
      void invalidateAll();
    },
    onError: onErr,
  });

  function invalidateAll() {
    void invalidate();
    void qc.invalidateQueries({ queryKey: ['to-verify'] });
    void qc.invalidateQueries({ queryKey: ['pending-approvals'] });
  }

  return (
    <div>
      <PageHeader title="Reservas (Admin)" subtitle="Gestiona todas las reservas del sistema" />
      <ErrorMessage message={actionError} />

      {/* Solicitudes recurrentes por aprobar */}
      <div className="card card-pad mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-graphite-700">Solicitudes recurrentes por aprobar</h2>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
            {pendingQuery.data?.length ?? 0} pendientes
          </span>
        </div>
        {pendingQuery.isLoading && <Spinner />}
        {pendingQuery.data && pendingQuery.data.length === 0 && (
          <EmptyState message="No hay solicitudes recurrentes pendientes." />
        )}
        {pendingQuery.data && pendingQuery.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Espacio</th>
                  <th>Rango de fechas</th>
                  <th>Horario</th>
                  <th>Frecuencia</th>
                  <th>Asist.</th>
                  <th className="text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendingQuery.data.map((b) => (
                  <tr key={b.id}>
                    <td>{b.user?.email ?? b.userId}</td>
                    <td className="font-medium text-graphite-800">{b.space?.name ?? b.spaceId}</td>
                    <td className="whitespace-nowrap">
                      {b.recurrenceStartDate ? `${b.recurrenceStartDate} → ${b.recurrenceEndDate ?? ''}` : b.bookingDate}
                    </td>
                    <td>
                      {b.startTime}–{b.endTime}
                    </td>
                    <td>
                      {b.recurrenceFrequency === 'DAILY'
                        ? 'Diaria'
                        : b.recurrenceFrequency === 'WEEKLY'
                          ? 'Semanal'
                          : b.recurrenceFrequency === 'MONTHLY'
                            ? 'Mensual'
                            : '—'}
                    </td>
                    <td>{b.attendeesCount}</td>
                    <td className="space-x-1 text-right">
                      <button onClick={() => approveMutation.mutate(b.id)} className="btn btn-ghost btn-sm text-teal-700">
                        Aprobar
                      </button>
                      <button onClick={() => rejectMutation.mutate(b.id)} className="btn btn-ghost btn-sm text-rose-600">
                        Rechazar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                      {b.status === 'CONFIRMED' && isFuture(b) && (
                        <button
                          onClick={() => setToRelease(b)}
                          title="Cancela anticipadamente esta reserva y deja disponible el espacio."
                          className="btn btn-ghost btn-sm text-teal-700"
                        >
                          Liberar espacio
                        </button>
                      )}
                      {b.status === 'CONFIRMED' && (
                        <>
                          <button onClick={() => setToCancel(b)} className="btn btn-ghost btn-sm text-rose-600">
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

      <ConfirmDialog
        open={!!toRelease}
        title="Liberar espacio"
        description={
          toRelease
            ? `¿Seguro que deseas liberar este espacio? La reserva de "${toRelease.space?.name ?? ''}" será cancelada y el colaborador será notificado.`
            : ''
        }
        confirmLabel="Sí, liberar"
        loading={releaseMutation.isPending}
        onConfirm={() => toRelease && releaseMutation.mutate(toRelease.id)}
        onCancel={() => setToRelease(null)}
      />
    </div>
  );
}

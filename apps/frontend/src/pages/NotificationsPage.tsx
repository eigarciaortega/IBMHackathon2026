import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../services';
import { Spinner } from '../components/Spinner';
import { EmptyState, ErrorMessage } from '../components/ErrorMessage';
import { PageHeader } from '../components/PageHeader';
import { getApiErrorMessage } from '../lib/api';

export function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list({ limit: 50 }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => void invalidate(),
  });
  const markAll = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => void invalidate(),
  });

  return (
    <div>
      <PageHeader
        title="Notificaciones"
        subtitle={data?.unread ? `${data.unread} sin leer` : 'Todo al día'}
        actions={
          <button onClick={() => markAll.mutate()} className="btn btn-secondary btn-sm">
            Marcar todas como leídas
          </button>
        }
      />

      {isLoading && <Spinner />}
      {error && <ErrorMessage message={getApiErrorMessage(error)} />}
      {data && data.items.length === 0 && <EmptyState message="No tienes notificaciones." />}

      <ul className="space-y-2">
        {data?.items.map((n) => (
          <li
            key={n.id}
            className={`card flex items-start justify-between gap-3 p-4 ${
              n.isRead ? '' : 'border-brand-200 bg-brand-50/40'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {!n.isRead && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-brand-600" />}
                <p className="font-medium text-slate-900">{n.title}</p>
              </div>
              <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
              <p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            {!n.isRead && (
              <button onClick={() => markRead.mutate(n.id)} className="btn btn-ghost btn-sm text-brand-700">
                Marcar leída
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

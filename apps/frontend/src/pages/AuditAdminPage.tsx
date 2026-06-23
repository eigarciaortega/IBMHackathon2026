import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditService } from '../services';
import { Spinner } from '../components/Spinner';
import { EmptyState, ErrorMessage } from '../components/ErrorMessage';
import { PageHeader } from '../components/PageHeader';
import { getApiErrorMessage } from '../lib/api';

const ACTIONS = [
  'LOGIN', 'LOGOUT', 'CREATE_USER', 'UPDATE_USER', 'DISABLE_USER',
  'CREATE_SPACE', 'UPDATE_SPACE', 'DISABLE_SPACE', 'CREATE_BOOKING',
  'CANCEL_BOOKING', 'MARK_NO_SHOW', 'CREATE_RESOURCE', 'UPDATE_RESOURCE',
  'DELETE_RESOURCE', 'CREATE_FAQ', 'UPDATE_FAQ', 'DELETE_FAQ',
];

export function AuditAdminPage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit', { action, page }],
    queryFn: () => auditService.list({ action: action || undefined, page, limit: 20 }),
  });

  return (
    <div>
      <PageHeader title="Auditoría" subtitle="Registro de eventos críticos del sistema" />

      <div className="card card-pad mb-6">
        <select
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
          className="select sm:w-72"
        >
          <option value="">Todas las acciones</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorMessage message={getApiErrorMessage(error)} />}
      {data && data.items.length === 0 && <EmptyState message="No hay eventos de auditoría." />}

      {data && data.items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>Usuario</th>
                  <th>Resultado</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</td>
                    <td className="font-medium text-slate-800">{a.action}</td>
                    <td>
                      {a.entityType}
                      {a.entityId ? ` (${a.entityId.slice(0, 8)}…)` : ''}
                    </td>
                    <td>{a.userId.slice(0, 8)}…</td>
                    <td>
                      {a.success ? (
                        <span className="text-green-600">✓ OK</span>
                      ) : (
                        <span className="text-red-600">✗ Fallo</span>
                      )}
                    </td>
                    <td>{a.ipAddress ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            Página {data.page} · {data.total} eventos
          </span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn btn-secondary btn-sm">
              Anterior
            </button>
            <button
              disabled={data.page * data.limit >= data.total}
              onClick={() => setPage((p) => p + 1)}
              className="btn btn-secondary btn-sm"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

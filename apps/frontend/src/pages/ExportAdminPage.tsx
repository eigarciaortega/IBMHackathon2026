import { useState } from 'react';
import { exportService } from '../services';
import { ErrorMessage } from '../components/ErrorMessage';
import { PageHeader } from '../components/PageHeader';
import { getApiErrorMessage } from '../lib/api';

const ENTITIES: { key: 'bookings' | 'spaces' | 'users' | 'audit'; label: string; desc: string }[] = [
  { key: 'bookings', label: 'Reservas', desc: 'Historial completo de reservas' },
  { key: 'spaces', label: 'Espacios', desc: 'Catálogo de espacios' },
  { key: 'users', label: 'Usuarios', desc: 'Sin datos sensibles' },
  { key: 'audit', label: 'Auditoría', desc: 'Eventos del sistema' },
];

export function ExportAdminPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (entity: 'bookings' | 'spaces' | 'users' | 'audit') => {
    setError(null);
    setBusy(entity);
    try {
      await exportService.download(entity);
    } catch (e) {
      setError(getApiErrorMessage(e, 'No se pudo exportar.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader title="Exportar" subtitle="Descarga de datos en formato CSV (Excel no disponible en el MVP)" />
      <ErrorMessage message={error} />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ENTITIES.map((e) => (
          <button
            key={e.key}
            onClick={() => download(e.key)}
            disabled={busy === e.key}
            className="card flex flex-col items-start p-5 text-left transition hover:shadow-md disabled:opacity-60"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </div>
            <div className="font-semibold text-slate-900">{e.label}</div>
            <div className="text-xs text-slate-500">{e.desc}</div>
            <div className="mt-2 text-xs font-medium text-brand-700">
              {busy === e.key ? 'Descargando…' : 'Descargar CSV →'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

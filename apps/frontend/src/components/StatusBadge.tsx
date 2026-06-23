const STYLES: Record<string, { cls: string; dot: string; label?: string }> = {
  ACTIVE: { cls: 'bg-mint-50 text-mint-500 ring-mint-500/20', dot: 'bg-mint-500' },
  AVAILABLE: { cls: 'bg-mint-50 text-mint-500 ring-mint-500/20', dot: 'bg-mint-500', label: 'Disponible' },
  CONFIRMED: { cls: 'bg-teal-50 text-teal-700 ring-teal-600/20', dot: 'bg-teal-500', label: 'Confirmada' },
  ATTENDED: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500', label: 'Asistió' },
  FINISHED: { cls: 'bg-graphite-100 text-graphite-600 ring-graphite-400/20', dot: 'bg-graphite-400', label: 'Finalizada' },
  MAINTENANCE: { cls: 'bg-amber-50 text-amber-700 ring-amber-500/20', dot: 'bg-amber-500', label: 'Mantenimiento' },
  PENDING_APPROVAL: { cls: 'bg-amber-50 text-amber-700 ring-amber-500/20', dot: 'bg-amber-500', label: 'Por aprobar' },
  INACTIVE: { cls: 'bg-graphite-100 text-graphite-500 ring-graphite-400/20', dot: 'bg-graphite-400', label: 'Inactivo' },
  BLOCKED: { cls: 'bg-rose-50 text-rose-700 ring-rose-600/20', dot: 'bg-rose-500', label: 'Bloqueado' },
  CANCELLED: { cls: 'bg-rose-50 text-rose-700 ring-rose-600/20', dot: 'bg-rose-500', label: 'Cancelada' },
  NO_SHOW: { cls: 'bg-orange-50 text-orange-700 ring-orange-600/20', dot: 'bg-orange-500', label: 'No-show' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STYLES[status] ?? { cls: 'bg-graphite-100 text-graphite-600 ring-graphite-400/20', dot: 'bg-graphite-400' };
  return (
    <span className={`badge ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label ?? status}
    </span>
  );
}

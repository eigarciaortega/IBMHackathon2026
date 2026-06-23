import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services';
import { ErrorMessage, EmptyState } from '../components/ErrorMessage';
import { StatGridSkeleton } from '../components/Skeleton';
import { PageHeader } from '../components/PageHeader';
import { getApiErrorMessage } from '../lib/api';

const icon = (path: string) => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const TONES: Record<string, { icon: string }> = {
  teal: { icon: 'bg-teal-50 text-teal-600' },
  mint: { icon: 'bg-mint-50 text-mint-500' },
  amber: { icon: 'bg-amber-50 text-amber-600' },
  rose: { icon: 'bg-rose-50 text-rose-600' },
  graphite: { icon: 'bg-graphite-100 text-graphite-600' },
};

function Stat({
  label,
  value,
  tone = 'teal',
  glyph,
  context,
}: {
  label: string;
  value: number | string;
  tone?: keyof typeof TONES;
  glyph: ReactNode;
  context?: ReactNode;
}) {
  return (
    <div className="stat animate-fade-up">
      <div className="flex items-start justify-between">
        <div className={`stat-icon ${TONES[tone].icon}`}>{glyph}</div>
        {context}
      </div>
      <div className="mt-4 stat-value">{value}</div>
      <div className="mt-1 stat-label">{label}</div>
    </div>
  );
}

function Donut({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative h-28 w-28">
      <svg viewBox="0 0 64 64" className="h-28 w-28 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#eceef2" strokeWidth="8" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#0f7d74"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-graphite-900">{value}%</span>
        <span className="text-[10px] uppercase tracking-wider text-graphite-400">asistencia</span>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard', 'admin'], queryFn: dashboardService.admin });
  if (isLoading) return <StatGridSkeleton count={4} />;
  if (error) return <ErrorMessage message={getApiErrorMessage(error)} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Espacios activos"
          value={data.availableSpaces}
          tone="teal"
          glyph={icon('M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5')}
          context={<span className="stat-trend-flat">de {data.totalSpaces} totales</span>}
        />
        <Stat
          label="Reservas hoy"
          value={data.todayBookings}
          tone="mint"
          glyph={icon('M6.75 3v2.25M17.25 3v2.25M3 7.5h18M4.5 21h15a1.5 1.5 0 001.5-1.5V7.5H3v12A1.5 1.5 0 004.5 21z')}
          context={<span className="stat-trend-flat">{data.weeklyBookings} esta semana</span>}
        />
        <Stat
          label="Ocupación hoy"
          value={`${data.occupancyRate}%`}
          tone="amber"
          glyph={icon('M3 13.5l3-3 4 4 5-5 4 4M3 19.5h18')}
        />
        <Stat
          label="En mantenimiento"
          value={data.maintenanceSpaces}
          tone="rose"
          glyph={icon('M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.28M15 12a3 3 0 11-6 0 3 3 0 016 0z')}
        />
      </div>

      {/* Asistencia + horas pico */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card card-pad animate-fade-up">
          <h3 className="mb-1 text-sm font-semibold text-graphite-700">Control de asistencia</h3>
          <p className="mb-4 text-xs text-graphite-400">Verificación de uso de espacios</p>
          <div className="flex items-center gap-5">
            <Donut value={data.attendanceRate} />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-graphite-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Verificadas
                </span>
                <span className="font-semibold text-graphite-900">{data.verifiedAttendance}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-graphite-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> No-shows
                </span>
                <span className="font-semibold text-graphite-900">{data.noShows}</span>
              </div>
              <div className="flex items-center justify-between border-t border-graphite-100 pt-3">
                <span className="flex items-center gap-2 text-sm text-graphite-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Canceladas
                </span>
                <span className="font-semibold text-graphite-900">{data.cancelledBookings}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card card-pad animate-fade-up lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-graphite-700">Horas pico de reserva</h3>
          {data.peakHours.length === 0 ? (
            <EmptyState message="Aún no hay reservas para mostrar tendencias." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.peakHours.map((p) => ({ hora: `${p.hour}:00`, reservas: p.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" vertical={false} />
                <XAxis dataKey="hora" tick={{ fontSize: 12, fill: '#828da0' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#828da0' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f6f7f9' }} contentStyle={{ borderRadius: 12, border: '1px solid #eceef2', fontSize: 12 }} />
                <Bar dataKey="reservas" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {data.peakHours.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#0f7d74' : '#34b7a8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top espacios */}
      <div className="card card-pad animate-fade-up">
        <h3 className="mb-4 text-sm font-semibold text-graphite-700">Espacios más utilizados</h3>
        {data.topSpaces.length === 0 ? (
          <EmptyState message="Sin datos de uso todavía." />
        ) : (
          <div className="space-y-3">
            {data.topSpaces.map((s, idx) => {
              const max = data.topSpaces[0].count || 1;
              return (
                <div key={s.spaceId} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">
                    {idx + 1}
                  </span>
                  <span className="w-40 truncate text-sm text-graphite-700">{s.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-graphite-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-mint-500" style={{ width: `${(s.count / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold text-graphite-900">{s.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CollaboratorDashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard', 'collaborator'], queryFn: dashboardService.collaborator });
  if (isLoading) return <StatGridSkeleton count={2} />;
  if (error) return <ErrorMessage message={getApiErrorMessage(error)} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          label="Espacios disponibles"
          value={data.availableSpaces}
          tone="mint"
          glyph={icon('M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5')}
        />
        <Stat
          label="Próximas reservas"
          value={data.upcomingBookings.length}
          tone="teal"
          glyph={icon('M6.75 3v2.25M17.25 3v2.25M3 7.5h18M4.5 21h15a1.5 1.5 0 001.5-1.5V7.5H3v12A1.5 1.5 0 004.5 21z')}
        />
        <Link to="/spaces" className="stat group flex flex-col justify-center bg-graphite-950 text-white">
          <span className="text-sm text-white/70">¿Listo para trabajar?</span>
          <span className="mt-1 flex items-center gap-2 text-lg font-semibold">
            Reservar espacio
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </span>
        </Link>
      </div>

      <div className="card card-pad">
        <h3 className="mb-4 text-sm font-semibold text-graphite-700">Tu agenda</h3>
        {data.upcomingBookings.length === 0 ? (
          <EmptyState message="No tienes reservas próximas. Reserva un espacio para empezar." />
        ) : (
          <ol className="relative space-y-4 border-l-2 border-graphite-100 pl-5">
            {data.upcomingBookings.map((b) => (
              <li key={b.id} className="relative animate-fade-up">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-teal-500 shadow" />
                <div className="flex items-center justify-between rounded-xl bg-graphite-50 px-4 py-3">
                  <div>
                    <div className="font-semibold text-graphite-900">{b.spaceName}</div>
                    <div className="text-xs text-graphite-500">{b.date}</div>
                  </div>
                  <span className="rounded-lg bg-white px-2.5 py-1 text-sm font-medium text-teal-700 shadow-sm">
                    {b.startTime}–{b.endTime}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { isAdmin, user } = useAuth();
  return (
    <div>
      <PageHeader
        title={`Hola, ${user?.firstName ?? ''}`}
        subtitle={isAdmin ? 'Resumen operativo de tus espacios' : 'Tu experiencia de trabajo, organizada'}
      />
      {isAdmin ? <AdminDashboard /> : <CollaboratorDashboard />}
    </div>
  );
}

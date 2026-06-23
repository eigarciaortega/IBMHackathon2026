import { ReactNode, useEffect, useRef } from 'react';
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
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../lib/api';
import { Occupancy } from '../types';

const icon = (path: string) => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const ICONS = {
  occupied: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  available: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  today: 'M6.75 3v2.25M17.25 3v2.25M3 7.5h18M4.5 21h15a1.5 1.5 0 001.5-1.5V7.5H3v12A1.5 1.5 0 004.5 21z',
  week: 'M3 13.5l3-3 4 4 5-5 4 4M3 19.5h18',
  month: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
  attendance: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  spaces: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
  clock: 'M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
} as const;

const TONES: Record<string, { icon: string; ring: string }> = {
  teal: { icon: 'bg-teal-50 text-teal-600', ring: 'ring-teal-100' },
  mint: { icon: 'bg-mint-50 text-mint-500', ring: 'ring-mint-100' },
  amber: { icon: 'bg-amber-50 text-amber-600', ring: 'ring-amber-100' },
  rose: { icon: 'bg-rose-50 text-rose-600', ring: 'ring-rose-100' },
  graphite: { icon: 'bg-graphite-100 text-graphite-600', ring: 'ring-graphite-100' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-100' },
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

const HHMM = () => {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return fmt.format(new Date());
};

// ---------------- Estado de salas ahora ----------------
const STATUS_META: Record<Occupancy['spaceOccupancyStatus'][number]['status'], { label: string; dot: string; chip: string }> = {
  available: { label: 'Disponible', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  occupied: { label: 'Ocupada', dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
  maintenance: { label: 'Mantenimiento', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  inactive: { label: 'Inactiva', dot: 'bg-graphite-400', chip: 'bg-graphite-100 text-graphite-600 ring-graphite-400/20' },
};

function RoomStatus({ rooms }: { rooms: Occupancy['spaceOccupancyStatus'] }) {
  if (rooms.length === 0) return <EmptyState message="No hay salas registradas." />;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rooms.map((s) => {
        const meta = STATUS_META[s.status];
        return (
          <div key={s.spaceId} className="rounded-xl border border-graphite-100 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-graphite-900">{s.spaceName}</div>
                <div className="text-xs text-graphite-500">Capacidad: {s.capacity}</div>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.chip}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
            </div>
            <div className="mt-3 text-sm text-graphite-600">
              {s.status === 'occupied' && s.currentBooking && (
                <span>
                  Ocupada hasta <span className="font-semibold text-graphite-900">{s.nextAvailableAt}</span> · {s.currentBooking.userName}
                </span>
              )}
              {s.status === 'available' &&
                (s.nextBookingAt ? (
                  <span>Próxima reserva a las <span className="font-semibold text-graphite-900">{s.nextBookingAt}</span></span>
                ) : (
                  <span className="text-emerald-600">Disponible todo el día</span>
                ))}
              {s.status === 'maintenance' && <span>En mantenimiento</span>}
              {s.status === 'inactive' && <span>Fuera de servicio</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Timeline del día (08:00–18:00) ----------------
const DAY_START = 8;
const DAY_END = 18;
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);

function toMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function Timeline({ rows }: { rows: Occupancy['todayTimeline'] }) {
  if (rows.length === 0) return <EmptyState message="No hay reservas confirmadas para hoy." />;
  const total = (DAY_END - DAY_START) * 60;
  const pct = (min: number) => `${((min - DAY_START * 60) / total) * 100}%`;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        {/* Cabecera de horas */}
        <div className="flex border-b border-graphite-100 pb-1 pl-40">
          {HOURS.map((h) => (
            <div key={h} className="flex-1 text-center text-[11px] font-medium text-graphite-400">
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        {/* Filas por sala */}
        <div className="divide-y divide-graphite-50">
          {rows.map((row) => (
            <div key={row.spaceId} className="flex items-center py-2">
              <div className="w-40 truncate pr-3 text-sm font-medium text-graphite-700">{row.spaceName}</div>
              <div className="relative h-8 flex-1 rounded-md bg-graphite-50">
                {row.events.map((e, i) => {
                  const start = Math.max(toMin(e.startTime), DAY_START * 60);
                  const end = Math.min(toMin(e.endTime), DAY_END * 60);
                  if (end <= start) return null;
                  return (
                    <div
                      key={i}
                      title={`${e.startTime}–${e.endTime} · ${e.userName}`}
                      className="absolute top-1 bottom-1 overflow-hidden rounded bg-gradient-to-r from-teal-500 to-mint-500 px-1.5 text-[10px] font-medium leading-6 text-white shadow-sm"
                      style={{ left: pct(start), width: `calc(${pct(end)} - ${pct(start)})` }}
                    >
                      {e.startTime}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Admin Dashboard ----------------
function AdminDashboard() {
  const toast = useToast();
  const notified = useRef(false);

  const adminQ = useQuery({ queryKey: ['dashboard', 'admin'], queryFn: dashboardService.admin });
  const occQ = useQuery({ queryKey: ['dashboard', 'occupancy'], queryFn: dashboardService.occupancy });

  useEffect(() => {
    if (occQ.error && !notified.current) {
      notified.current = true;
      toast.error('No se pudo cargar la analítica de ocupación. Mostrando datos básicos.');
    }
  }, [occQ.error, toast]);

  if (adminQ.isLoading && occQ.isLoading) return <StatGridSkeleton count={6} />;

  const admin = adminQ.data;
  const occ = occQ.data;

  // Fallback: si falla ocupación, usar métricas básicas del dashboard admin.
  const cards = occ
    ? [
        { label: 'Ocupadas ahora', value: occ.today.occupiedSpaces, tone: 'rose' as const, glyph: icon(ICONS.occupied), context: <span className="stat-trend-flat">de {occ.today.totalSpaces} salas</span> },
        { label: 'Disponibles hoy', value: occ.today.availableSpaces, tone: 'emerald' as const, glyph: icon(ICONS.available), context: <span className="stat-trend-flat">{occ.today.occupancyRate}% ocupación</span> },
        { label: 'Reservas de hoy', value: occ.today.bookingsCount, tone: 'teal' as const, glyph: icon(ICONS.today), context: <span className="stat-trend-flat">{occ.week.bookingsCount} esta semana</span> },
        { label: 'Ocupación semanal', value: `${occ.week.occupancyRate}%`, tone: 'mint' as const, glyph: icon(ICONS.week), context: <span className="stat-trend-flat">{occ.week.bookingsCount} reservas</span> },
        { label: 'Ocupación mensual', value: `${occ.month.occupancyRate}%`, tone: 'amber' as const, glyph: icon(ICONS.month), context: <span className="stat-trend-flat">{occ.month.bookingsCount} reservas</span> },
        { label: 'Asistencia verificada', value: admin ? `${admin.attendanceRate}%` : '—', tone: 'graphite' as const, glyph: icon(ICONS.attendance), context: admin ? <span className="stat-trend-flat">{admin.verifiedAttendance} verificadas</span> : null },
      ]
    : admin
      ? [
          { label: 'Espacios activos', value: admin.availableSpaces, tone: 'teal' as const, glyph: icon(ICONS.month), context: <span className="stat-trend-flat">de {admin.totalSpaces} totales</span> },
          { label: 'Reservas hoy', value: admin.todayBookings, tone: 'mint' as const, glyph: icon(ICONS.today), context: <span className="stat-trend-flat">{admin.weeklyBookings} esta semana</span> },
          { label: 'Ocupación hoy', value: `${admin.occupancyRate}%`, tone: 'amber' as const, glyph: icon(ICONS.week), context: null },
          { label: 'Asistencia verificada', value: `${admin.attendanceRate}%`, tone: 'graphite' as const, glyph: icon(ICONS.attendance), context: <span className="stat-trend-flat">{admin.verifiedAttendance} verificadas</span> },
        ]
      : [];

  return (
    <div className="space-y-6">
      {/* Tarjetas principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {cards.map((c) => (
          <Stat key={c.label} {...c} />
        ))}
      </div>

      {!occ && occQ.error && (
        <ErrorMessage message="La analítica avanzada de ocupación no está disponible en este momento. Las tarjetas básicas siguen activas." />
      )}

      {occ && (
        <>
          {/* Estado de salas ahora */}
          <div className="card card-pad animate-fade-up">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-graphite-700">Estado de salas ahora</h3>
              <span className="text-xs text-graphite-400">Actualizado {HHMM()}</span>
            </div>
            <RoomStatus rooms={occ.spaceOccupancyStatus} />
          </div>

          {/* Timeline del día */}
          <div className="card card-pad animate-fade-up">
            <h3 className="mb-1 text-sm font-semibold text-graphite-700">Agenda del día</h3>
            <p className="mb-4 text-xs text-graphite-400">Ocupación por hora (08:00–18:00)</p>
            <Timeline rows={occ.todayTimeline} />
          </div>

          {/* Semanal + Mensual */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card card-pad animate-fade-up lg:col-span-2">
              <h3 className="mb-4 text-sm font-semibold text-graphite-700">Ocupación semanal</h3>
              {occ.week.dailyBreakdown.every((d) => d.bookings === 0) ? (
                <EmptyState message="Sin reservas esta semana." />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={occ.week.dailyBreakdown.map((d) => ({ dia: d.day.slice(0, 3), reservas: d.bookings, ocup: d.occupancyRate }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#828da0' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#828da0' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f6f7f9' }} contentStyle={{ borderRadius: 12, border: '1px solid #eceef2', fontSize: 12 }} />
                    <Bar dataKey="reservas" radius={[6, 6, 0, 0]} maxBarSize={44} fill="#0f7d74" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card card-pad animate-fade-up flex flex-col justify-center">
              <h3 className="mb-4 text-sm font-semibold text-graphite-700">Ocupación mensual</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-graphite-900">{occ.month.occupancyRate}%</span>
              </div>
              <p className="mt-1 text-sm text-graphite-500">de uso promedio este mes</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-graphite-100">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-mint-500" style={{ width: `${Math.min(100, occ.month.occupancyRate)}%` }} />
              </div>
              <p className="mt-4 text-sm text-graphite-600">
                <span className="text-2xl font-bold text-graphite-900">{occ.month.bookingsCount}</span> reservas en total
              </p>
            </div>
          </div>

          {/* Salas más usadas + Horas pico */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card card-pad animate-fade-up">
              <h3 className="mb-4 text-sm font-semibold text-graphite-700">Salas más usadas</h3>
              {occ.mostUsedSpaces.length === 0 ? (
                <EmptyState message="Sin datos de uso todavía." />
              ) : (
                <div className="space-y-3">
                  {occ.mostUsedSpaces.map((s, idx) => (
                    <div key={s.spaceId} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">{idx + 1}</span>
                      <span className="w-40 truncate text-sm text-graphite-700">{s.spaceName}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-graphite-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-mint-500" style={{ width: `${s.occupancyRate}%` }} />
                      </div>
                      <span className="w-8 text-right text-sm font-semibold text-graphite-900">{s.bookings}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card card-pad animate-fade-up">
              <h3 className="mb-4 text-sm font-semibold text-graphite-700">Horas pico</h3>
              {occ.peakHours.length === 0 ? (
                <EmptyState message="Aún no hay reservas para mostrar tendencias." />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={[...occ.peakHours].sort((a, b) => a.hour.localeCompare(b.hour)).map((p) => ({ hora: p.hour, reservas: p.bookings }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" vertical={false} />
                    <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#828da0' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#828da0' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f6f7f9' }} contentStyle={{ borderRadius: 12, border: '1px solid #eceef2', fontSize: 12 }} />
                    <Bar dataKey="reservas" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {(() => {
                        const max = Math.max(...occ.peakHours.map((p) => p.bookings));
                        return [...occ.peakHours]
                          .sort((a, b) => a.hour.localeCompare(b.hour))
                          .map((p, i) => <Cell key={i} fill={p.bookings === max ? '#0f7d74' : '#9fd8d0'} />);
                      })()}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------- Collaborator Dashboard ----------------
function CollaboratorDashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard', 'collaborator'], queryFn: dashboardService.collaborator });
  if (isLoading) return <StatGridSkeleton count={3} />;
  if (error) return <ErrorMessage message={getApiErrorMessage(error)} />;
  if (!data) return null;

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
  const todays = data.upcomingBookings.filter((b) => b.date === today);
  const next = data.upcomingBookings[0];

  return (
    <div className="space-y-6">
      {/* Sugerencia rápida + CTA */}
      <div className="card card-pad animate-fade-up flex flex-col items-start justify-between gap-4 bg-graphite-950 text-white sm:flex-row sm:items-center">
        <div>
          <div className="text-lg font-semibold">
            {data.availableSpaces > 0
              ? `Hay ${data.availableSpaces} ${data.availableSpaces === 1 ? 'sala disponible' : 'salas disponibles'} en este momento.`
              : 'No hay salas disponibles en este momento.'}
          </div>
          <p className="text-sm text-white/70">Encuentra un espacio y reserva en segundos.</p>
        </div>
        <Link to="/spaces" className="btn btn-primary shrink-0">Reservar ahora →</Link>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card card-pad animate-fade-up">
          <div className="flex items-center gap-2 text-sm font-semibold text-graphite-700">
            <span className={`stat-icon ${TONES.teal.icon}`}>{icon(ICONS.clock)}</span> Mi próxima reserva
          </div>
          {next ? (
            <div className="mt-4">
              <div className="text-lg font-semibold text-graphite-900">{next.spaceName}</div>
              <div className="text-sm text-graphite-500">{next.date}</div>
              <span className="mt-2 inline-block rounded-lg bg-teal-50 px-2.5 py-1 text-sm font-medium text-teal-700">
                {next.startTime}–{next.endTime}
              </span>
            </div>
          ) : (
            <p className="mt-4 text-sm text-graphite-500">No tienes reservas próximas.</p>
          )}
        </div>

        <Stat label="Mis reservas de hoy" value={todays.length} tone="mint" glyph={icon(ICONS.today)} />
        <Stat label="Espacios disponibles ahora" value={data.availableSpaces} tone="emerald" glyph={icon(ICONS.available)} />
      </div>

      {/* Agenda */}
      <div className="card card-pad">
        <h3 className="mb-4 text-sm font-semibold text-graphite-700">Tus próximas reservas</h3>
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
                    <div className="text-xs text-graphite-500">
                      {b.date}
                      {b.date === today && <span className="ml-2 rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">HOY</span>}
                    </div>
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
        title={isAdmin ? 'Centro de control de ocupación' : `Hola, ${user?.firstName ?? ''}`}
        subtitle={
          isAdmin
            ? 'Monitorea disponibilidad, uso de salas y asistencia en tiempo real.'
            : 'Tu experiencia de trabajo, organizada'
        }
      />
      {isAdmin ? <AdminDashboard /> : <CollaboratorDashboard />}
    </div>
  );
}

import { ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { notificationsService } from '../services';
import { AssistantWidget } from '../components/AssistantWidget';

interface NavItem {
  to: string;
  label: string;
  adminOnly?: boolean;
  icon: ReactNode;
}

const I = (path: string) => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Inicio', icon: I('M3 12l9-9 9 9M5 10v10h14V10') },
  { to: '/spaces', label: 'Espacios', icon: I('M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5') },
  { to: '/my-bookings', label: 'Mis Reservas', icon: I('M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0V11.25h18v7.5') },
  { to: '/notifications', label: 'Notificaciones', icon: I('M14.857 17.082a23.8 23.8 0 005.454-1.31A8.97 8.97 0 0118 9.75V9A6 6 0 006 9v.75a8.97 8.97 0 01-2.312 6.022 23.8 23.8 0 005.454 1.31m6.715 0a3 3 0 11-6.715 0') },
  { to: '/faq', label: 'Asistente FAQ', icon: I('M9.879 7.519A2.625 2.625 0 1114 9.75c0 1.5-2 2-2 3M12 17h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z') },
  { to: '/admin/bookings', label: 'Reservas', adminOnly: true, icon: I('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z') },
  { to: '/admin/users', label: 'Usuarios', adminOnly: true, icon: I('M15 19.5a3 3 0 00-6 0M18 20.25a4.5 4.5 0 00-12 0M12 12a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z') },
  { to: '/admin/audit', label: 'Auditoría', adminOnly: true, icon: I('M3.75 3v11.25A2.25 2.25 0 006 16.5h12M7.5 9l3 3 3.75-4.5') },
  { to: '/admin/export', label: 'Exportar', adminOnly: true, icon: I('M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3') },
];

function initials(first?: string, last?: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || 'U';
}

export function AppLayout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV.filter((i) => !i.adminOnly || isAdmin);

  const { data: notif } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsService.list({ limit: 1 }),
    refetchInterval: 30_000,
  });
  const unread = notif?.unread ?? 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-teal-500/15 text-white'
        : 'text-graphite-300 hover:bg-white/5 hover:text-white'
    }`;

  return (
    <div className="flex min-h-screen bg-pearl">
      {/* Sidebar premium oscuro */}
      <aside className="hidden w-64 flex-col bg-graphite-950 md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-sm font-bold text-teal-300 ring-1 ring-teal-400/30">
            OS
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">OfficeSpace</div>
            <div className="text-[10px] uppercase tracking-wider text-graphite-400">Workspace Suite</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} className={linkClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full bg-teal-400 transition-all ${
                      isActive ? 'w-1 opacity-100' : 'w-0 opacity-0'
                    }`}
                  />
                  <span className={isActive ? 'text-teal-300' : 'text-graphite-400 group-hover:text-white'}>
                    {i.icon}
                  </span>
                  <span>{i.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="m-3 rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-mint-500 text-sm font-semibold text-graphite-900">
              {initials(user?.firstName, user?.lastName)}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-medium text-white">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-teal-300">{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="mt-3 w-full rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20">
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-graphite-200/70 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-graphite-950 text-xs font-bold text-teal-300">OS</div>
            <span className="font-semibold text-graphite-900">OfficeSpace</span>
          </div>
          <div className="hidden text-sm text-graphite-400 md:block">Sistema inteligente de experiencia de espacios</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/notifications')}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-graphite-500 transition hover:bg-graphite-100 hover:text-graphite-800"
              aria-label="Notificaciones"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.8 23.8 0 005.454-1.31A8.97 8.97 0 0118 9.75V9A6 6 0 006 9v.75a8.97 8.97 0 01-2.312 6.022 23.8 23.8 0 005.454 1.31m6.715 0a3 3 0 11-6.715 0" />
              </svg>
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <span className="hidden rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-600/20 sm:inline">
              {user?.role}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-mint-500 text-sm font-semibold text-white">
              {initials(user?.firstName, user?.lastName)}
            </div>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm md:hidden">
              Salir
            </button>
          </div>
        </header>

        {/* Nav móvil */}
        <nav className="flex gap-1 overflow-x-auto border-b border-graphite-200/70 bg-white px-3 py-2 md:hidden">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive ? 'bg-teal-600 text-white' : 'text-graphite-600 hover:bg-graphite-100'
                }`
              }
            >
              {i.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1600px] animate-fade-in p-4 sm:p-6 lg:p-8 xl:p-10">
            <Outlet />
          </div>
        </main>
      </div>

      {/* OfficeSpace Assistant — disponible en toda la app tras login */}
      <AssistantWidget />
    </div>
  );
}

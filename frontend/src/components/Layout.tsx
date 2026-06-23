// Estructura de la app autenticada: barra superior con marca, navegación según
// rol y menú de usuario. El contenido de cada página se renderiza vía <Outlet>.
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { NotificacionesMenu } from './NotificacionesMenu'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'
import { IconAdmin, IconBuscar, IconReservas, Logo } from './icons'

function enlaceClase({ isActive }: { isActive: boolean }) {
  return [
    'inline-flex items-center gap-2 rounded-[0.5rem] px-2.5 py-2 text-sm font-medium transition-colors sm:px-3',
    isActive ? 'bg-azul-soft text-azul-strong' : 'text-muted hover:bg-surface-muted hover:text-body',
  ].join(' ')
}

export function Layout() {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'ADMINISTRADOR'

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
          <div className="flex items-center gap-2.5 text-azul">
            <Logo />
            <span className="hidden text-[0.95rem] font-semibold tracking-tight text-ink min-[420px]:inline">
              Office<span className="text-azul">Space</span>
            </span>
          </div>

          <nav className="ml-1 flex items-center gap-0.5 sm:ml-2 sm:gap-1" aria-label="Navegación principal">
            <NavLink to="/buscar" className={enlaceClase}>
              <IconBuscar className="size-[18px]" />
              <span className="hidden sm:inline">Buscar</span>
            </NavLink>
            <NavLink to="/mis-reservas" className={enlaceClase}>
              <IconReservas className="size-[18px]" />
              <span className="hidden sm:inline">Mis reservas</span>
            </NavLink>
            {esAdmin && (
              <NavLink to="/admin" className={enlaceClase}>
                <IconAdmin className="size-[18px]" />
                <span className="hidden sm:inline">Administración</span>
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {esAdmin && <NotificacionesMenu />}
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}

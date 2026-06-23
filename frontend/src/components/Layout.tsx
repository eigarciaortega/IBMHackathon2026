// Estructura de la app autenticada: barra superior con marca, navegación según
// rol y menú de usuario. El contenido de cada página se renderiza vía <Outlet>.
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { IconAdmin, IconBuscar, IconReservas, IconSalir, Logo } from './icons'

function enlaceClase({ isActive }: { isActive: boolean }) {
  return [
    'inline-flex items-center gap-2 rounded-[0.5rem] px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-pino-soft text-pino-strong' : 'text-muted hover:bg-surface-muted hover:text-body',
  ].join(' ')
}

export function Layout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const esAdmin = usuario?.rol === 'ADMINISTRADOR'

  function salir() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5 text-pino">
            <Logo />
            <span className="text-[0.95rem] font-semibold tracking-tight text-ink">
              Office<span className="text-pino">Space</span>
            </span>
          </div>

          <nav className="ml-2 flex items-center gap-1" aria-label="Navegación principal">
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

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-body">{usuario?.nombre}</p>
              <p className="text-xs text-muted">
                {esAdmin ? 'Administrador' : 'Colaborador'}
              </p>
            </div>
            <div
              className="grid size-9 place-items-center rounded-full bg-pino-soft text-sm font-semibold text-pino-strong"
              aria-hidden="true"
            >
              {iniciales(usuario?.nombre ?? '')}
            </div>
            <button onClick={salir} className="btn-ghost btn-sm" aria-label="Cerrar sesión">
              <IconSalir className="size-[18px]" />
              <span className="hidden md:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/)
  if (partes.length === 0 || !partes[0]) return '·'
  const a = partes[0][0] ?? ''
  const b = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (a + b).toUpperCase()
}

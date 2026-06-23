// Pantalla 1: Login. Formulario usuario/contraseña con mensaje de error claro y
// redirección según rol. Panel de marca a la izquierda en desktop.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../lib/api'
import { IconChevron, IconCheck, Logo } from '../components/icons'
import { ThemeToggle } from '../components/ThemeToggle'
import { Spinner } from '../components/ui'

const VENTAJAS = [
  'Disponibilidad en tiempo real',
  'Reservas sin solapamiento de horario',
  'Ocupación del día a la vista',
]

// Cuentas de la semilla; un clic autocompleta el formulario para agilizar la demo.
const CUENTAS_PRUEBA = [
  { email: 'admin@corporativoalpha.com', password: 'Admin123', rol: 'Administrador' },
  { email: 'carlos.mendez@corporativoalpha.com', password: 'User123', rol: 'Colaborador' },
] as const

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  // Las cuentas de prueba arrancan ocultas; se revelan con el desplegable.
  const [verCuentas, setVerCuentas] = useState(false)

  async function alEnviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await login(email.trim(), password)
      navigate('/buscar', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.codigo === 'SIN_CONEXION' ? 'No hay conexión con el servidor. Intenta de nuevo.' : err.message)
      } else {
        setError('No se pudo iniciar sesión.')
      }
    } finally {
      setEnviando(false)
    }
  }

  function usarCuenta(cuenta: (typeof CUENTAS_PRUEBA)[number]) {
    setEmail(cuenta.email)
    setPassword(cuenta.password)
    setError(null)
  }

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      <ThemeToggle className="absolute right-3 top-3 z-10" />
      {/* Panel de marca (oculto en móvil) */}
      <aside className="relative hidden flex-col overflow-hidden px-12 py-12 text-white lg:flex xl:px-20 bg-gradient-to-br from-[#16357a] via-[#16357a] to-[#0d2150]">
        {/* Motivo de cuadrícula tenue. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(140% 100% at 20% 0%, #000 35%, transparent 100%)',
          }}
        />
        {/* Glifo grande y tenue (franjas de reserva) como firma de marca. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 100 64"
          className="pointer-events-none absolute -right-16 bottom-4 w-[34rem] text-white opacity-[0.05]"
          fill="currentColor"
        >
          <rect x="2" y="6" width="64" height="12" rx="6" />
          <rect x="22" y="26" width="64" height="12" rx="6" />
          <rect x="2" y="46" width="44" height="12" rx="6" />
        </svg>

        <div className="relative flex items-center gap-2.5">
          <Logo tono="claro" />
          <span className="text-lg font-semibold tracking-tight">OfficeSpace</span>
        </div>

        {/* Bloque central */}
        <div className="relative my-auto max-w-lg">
          <h1 className="text-balance text-[2.9rem] font-semibold leading-[1.05] tracking-tight text-white">
            Reserva salas y escritorios sin choques de horario.
          </h1>

          <ul className="mt-10 space-y-4">
            {VENTAJAS.map((v) => (
              <li key={v} className="flex items-center gap-3.5 text-[0.95rem] text-white/90">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-ambar ring-1 ring-white/15">
                  <IconCheck className="size-3.5" />
                </span>
                {v}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-sm text-white/65">
          <span>Corporativo Alpha · Gestión de espacios</span>
          <Link to="/about" className="rounded text-white/75 underline-offset-4 hover:text-white hover:underline">
            Acerca de
          </Link>
        </div>
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[24rem]">
          <div className="mb-10 lg:hidden">
            <div className="inline-flex items-center gap-2.5">
              <Logo />
              <span className="text-lg font-semibold tracking-tight text-ink">OfficeSpace</span>
            </div>
          </div>

          <h2 className="text-[1.75rem] font-semibold tracking-tight text-ink">Iniciar sesión</h2>
          <p className="mt-2 text-sm text-muted">
            Entra con tu cuenta corporativa para gestionar tus reservas.
          </p>

          <form onSubmit={alEnviar} className="mt-8 space-y-4" noValidate>
            {error && (
              <div
                role="alert"
                className="rounded-[0.625rem] border border-peligro/30 bg-peligro-soft px-3.5 py-3 text-sm font-medium text-peligro anim-aparecer"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">Correo electrónico</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                className="input"
                placeholder="tu.nombre@corporativoalpha.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Contraseña</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary mt-2 w-full" disabled={enviando}>
              {enviando ? <Spinner className="size-4" /> : null}
              {enviando ? 'Entrando…' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-8">
            <button
              type="button"
              onClick={() => setVerCuentas((v) => !v)}
              aria-expanded={verCuentas}
              aria-controls="cuentas-prueba"
              className="flex w-full items-center justify-between gap-2 rounded-[0.625rem] border border-border bg-surface-muted px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted transition-colors hover:text-body"
            >
              <span>Cuentas de prueba</span>
              <IconChevron className={`size-4 transition-transform motion-reduce:transition-none ${verCuentas ? 'rotate-180' : ''}`} />
            </button>

            {verCuentas && (
              <div
                id="cuentas-prueba"
                className="anim-aparecer mt-2 rounded-[0.625rem] border border-border bg-surface-muted px-2 py-2"
              >
                <p className="px-1.5 pb-1.5 text-xs text-muted">Toca una cuenta para autocompletar.</p>
                <ul className="space-y-0.5">
                  {CUENTAS_PRUEBA.map((c) => (
                    <li key={c.email}>
                      <button
                        type="button"
                        onClick={() => usarCuenta(c)}
                        aria-label={`Autocompletar con la cuenta de ${c.rol}: ${c.email}`}
                        className="flex w-full items-center justify-between gap-3 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-xs text-body">{c.email}</span>
                          <span className="font-mono text-[0.7rem] text-muted">{c.password}</span>
                        </span>
                        <span className="pill shrink-0 bg-azul-soft text-azul">{c.rol}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-xs text-muted lg:hidden">
            <Link to="/about" className="underline-offset-4 hover:text-body hover:underline">Acerca de OfficeSpace</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

// Pantalla 1: Login. Formulario usuario/contraseña con mensaje de error claro y
// redirección según rol. Panel de marca a la izquierda en desktop.
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../lib/api'
import { Logo } from '../components/icons'
import { Spinner } from '../components/ui'
import { OccupancyTrack } from '../components/OccupancyTrack'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

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

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca (oculto en móvil) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-pino-strong px-12 py-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <Logo className="text-white" />
          <span className="text-lg font-semibold">OfficeSpace</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-balance text-4xl font-semibold leading-tight text-white">
            Reserva salas y escritorios sin choques de horario.
          </h1>
          <p className="mt-4 text-pino-soft/90">
            La gestión híbrida de espacios de Corporativo Alpha: disponibilidad en tiempo real,
            reservas sin solapamiento y visibilidad de la ocupación del día.
          </p>
          <div className="mt-8 rounded-[var(--radius-lg)] bg-white/10 p-4 ring-1 ring-white/15">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-pino-soft/80">
              Sala Monterrey · hoy
            </p>
            <div className="[&_*]:!text-white">
              <OccupancyTrack
                franjas={[
                  { inicio: '09:00', fin: '10:30' },
                  { inicio: '13:00', fin: '14:00' },
                  { inicio: '16:00', fin: '18:00' },
                ]}
                mostrarHoras
              />
            </div>
          </div>
        </div>
        <p className="text-sm text-pino-soft/70">Corporativo Alpha · Gestión de espacios</p>
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 inline-flex items-center gap-2.5 text-pino">
              <Logo />
              <span className="text-lg font-semibold text-ink">OfficeSpace</span>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-ink">Iniciar sesión</h2>
          <p className="mt-1.5 text-sm text-muted">
            Entra con tu cuenta corporativa para gestionar tus reservas.
          </p>

          <form onSubmit={alEnviar} className="mt-8 space-y-4" noValidate>
            {error && (
              <div
                role="alert"
                className="rounded-[0.625rem] border border-peligro/30 bg-peligro-soft px-3.5 py-3 text-sm font-medium text-peligro"
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

            <button type="submit" className="btn-primary w-full" disabled={enviando}>
              {enviando ? <Spinner className="size-4" /> : null}
              {enviando ? 'Entrando…' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-8 rounded-[0.625rem] border border-border bg-surface-muted px-4 py-3.5 text-xs text-muted">
            <p className="mb-1.5 font-medium text-body">Cuentas de prueba</p>
            <p className="font-mono">admin@corporativoalpha.com · Admin123</p>
            <p className="font-mono">carlos.mendez@corporativoalpha.com · User123</p>
          </div>
        </div>
      </main>
    </div>
  )
}

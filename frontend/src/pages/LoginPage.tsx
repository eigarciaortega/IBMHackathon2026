// Pantalla 1: Login. Formulario usuario/contraseña con mensaje de error claro y
// redirección según rol. Panel de marca a la izquierda en desktop.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../lib/api'
import { IconCheck, Logo } from '../components/icons'
import { Spinner } from '../components/ui'
import { OccupancyTrack } from '../components/OccupancyTrack'

const VENTAJAS = [
  'Disponibilidad en tiempo real',
  'Reservas sin solapamiento de horario',
  'Ocupación del día a la vista',
]

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
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca (oculto en móvil) */}
      <aside className="relative hidden flex-col overflow-hidden px-10 py-10 text-white lg:flex xl:px-16 bg-gradient-to-br from-azul-strong via-azul-strong to-[#0f2657]">
        {/* Motivo de cuadrícula tenue que evoca el logo (franjas de reserva). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            maskImage: 'radial-gradient(130% 90% at 25% 10%, #000 35%, transparent 100%)',
          }}
        />

        <div className="relative flex items-center gap-2.5">
          <Logo tono="claro" />
          <span className="text-lg font-semibold tracking-tight">OfficeSpace</span>
        </div>

        {/* Bloque central */}
        <div className="relative my-auto max-w-md py-10">
          <h1 className="text-balance text-[2.6rem] font-semibold leading-[1.08] tracking-tight text-white">
            Reserva salas y escritorios sin choques de horario.
          </h1>
          <p className="mt-5 max-w-sm text-pretty leading-relaxed text-azul-soft/85">
            La gestión híbrida de espacios de Corporativo Alpha, sin el Excel
            compartido que duplicaba reservas.
          </p>

          <ul className="mt-7 space-y-2.5">
            {VENTAJAS.map((v) => (
              <li key={v} className="flex items-center gap-3 text-sm text-white/90">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/15 text-white">
                  <IconCheck className="size-3.5" />
                </span>
                {v}
              </li>
            ))}
          </ul>

          <div className="mt-8 max-w-sm rounded-[var(--radius-lg)] bg-white/[0.07] p-4 ring-1 ring-white/15">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-azul-soft/80">
              Sala Monterrey · hoy
            </p>
            <OccupancyTrack
              franjas={[
                { inicio: '09:00', fin: '10:30' },
                { inicio: '13:00', fin: '14:00' },
                { inicio: '16:00', fin: '18:00' },
              ]}
              mostrarHoras
              variante="oscuro"
            />
          </div>
        </div>

        <div className="relative flex items-center justify-between text-sm text-azul-soft/70">
          <span>Corporativo Alpha</span>
          <Link to="/about" className="rounded text-azul-soft/80 underline-offset-4 hover:text-white hover:underline">
            Acerca de
          </Link>
        </div>
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[23rem]">
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

            <button type="submit" className="btn-primary w-full" disabled={enviando}>
              {enviando ? <Spinner className="size-4" /> : null}
              {enviando ? 'Entrando…' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-8 rounded-[0.625rem] border border-border bg-surface-muted px-4 py-3.5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Cuentas de prueba</p>
            <ul className="space-y-1 font-mono text-xs text-body">
              <li>admin@corporativoalpha.com · Admin123</li>
              <li>carlos.mendez@corporativoalpha.com · User123</li>
            </ul>
          </div>

          <p className="mt-8 text-center text-xs text-muted lg:hidden">
            <Link to="/about" className="underline-offset-4 hover:text-body hover:underline">Acerca de OfficeSpace</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

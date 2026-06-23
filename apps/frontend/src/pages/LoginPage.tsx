import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage } from '../lib/api';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoginForm, loginSchema } from '../validators/schemas';

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (user) {
    navigate('/dashboard', { replace: true });
  }

  const onSubmit = async (values: LoginForm) => {
    setServerError(null);
    try {
      const res = await login(values.email, values.password);
      navigate(res.mustChangePassword ? '/change-password' : '/dashboard', { replace: true });
    } catch (e) {
      setServerError(getApiErrorMessage(e, 'No se pudo iniciar sesión.'));
    }
  };

  return (
    <div className="bg-blueprint relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Halos de color de fondo */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-lavender-400/15 blur-3xl" />

      {/* Tarjetas decorativas flotantes (salas / disponibilidad / ubicación) */}
      <div className="pointer-events-none absolute left-[8%] top-[18%] hidden animate-float lg:block" style={{ animationDelay: '0s' }}>
        <div className="glass w-44 px-4 py-3 text-white/90">
          <div className="flex items-center gap-2 text-xs text-mint-300">
            <span className="h-2 w-2 rounded-full bg-mint-400" /> Disponible ahora
          </div>
          <div className="mt-1 text-sm font-semibold">Sala Creativa</div>
          <div className="text-[11px] text-white/60">Piso 1 · 8 personas</div>
        </div>
      </div>
      <div className="pointer-events-none absolute right-[10%] top-[24%] hidden animate-float lg:block" style={{ animationDelay: '1.5s' }}>
        <div className="glass w-40 px-4 py-3 text-white/90">
          <div className="text-[11px] text-white/60">Ocupación hoy</div>
          <div className="mt-1 text-2xl font-bold text-gradient">72%</div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[72%] rounded-full bg-teal-400" />
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-[14%] left-[14%] hidden animate-float xl:block" style={{ animationDelay: '0.8s' }}>
        <div className="glass flex w-44 items-center gap-3 px-4 py-3 text-white/90">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/30 text-teal-200">📍</div>
          <div>
            <div className="text-sm font-semibold">12 espacios</div>
            <div className="text-[11px] text-white/60">listos para reservar</div>
          </div>
        </div>
      </div>

      {/* Tarjeta de login (centrada, flotante, glass) */}
      <div className="relative z-10 w-full max-w-md animate-fade-up">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/20 text-lg font-bold text-teal-200 ring-1 ring-teal-400/30">
            OS
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
            Bienvenido a <span className="text-gradient">OfficeSpace</span>
          </h1>
          <p className="mt-1 text-sm text-white/60">Tu espacio de trabajo, reservado en segundos.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="glass space-y-5 p-7">
          <ErrorMessage message={serverError} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Correo corporativo</label>
            <input
              type="email"
              autoComplete="username"
              placeholder="tucorreo@corporativoalpha.com"
              {...register('email')}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 transition focus:border-teal-300/60 focus:outline-none focus:ring-4 focus:ring-teal-400/15"
            />
            {errors.email && <p className="mt-1 text-xs text-rose-300">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 transition focus:border-teal-300/60 focus:outline-none focus:ring-4 focus:ring-teal-400/15"
            />
            {errors.password && <p className="mt-1 text-xs text-rose-300">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-teal-400 active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting ? 'Entrando…' : 'Entrar al espacio →'}
          </button>

          <p className="text-center text-xs text-white/40">
            Reserva ágil · Espacios disponibles · Experiencia premium
          </p>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../lib/api';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoginForm, loginSchema } from '../validators/schemas';

export function LoginPage() {
  const { login, user } = useAuth();
  const toast = useToast();
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
      toast.success(`Bienvenido, ${res.user.firstName}`);
      navigate(res.mustChangePassword ? '/change-password' : '/dashboard', { replace: true });
    } catch (e) {
      setServerError(getApiErrorMessage(e, 'No se pudo iniciar sesión.'));
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-graphite-950 p-4">
      {/* Patrón arquitectónico muy sutil + un acento de color contenido */}
      <div className="bg-blueprint pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -top-40 right-0 h-[28rem] w-[28rem] rounded-full bg-teal-700/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Encabezado de marca */}
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-lg font-bold text-white shadow-lift">
            OS
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">OfficeSpace</h1>
          <p className="mt-1 text-sm text-slate-300">Sistema inteligente de espacios de trabajo</p>
        </div>

        {/* Tarjeta de login sólida */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 rounded-3xl border border-white/10 bg-white p-7 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8"
        >
          <div>
            <h2 className="text-lg font-semibold text-graphite-900">Iniciar sesión</h2>
            <p className="mt-0.5 text-sm text-graphite-500">Accede con tu cuenta corporativa</p>
          </div>

          <ErrorMessage message={serverError} />

          <div>
            <label className="label">Correo corporativo</label>
            <input
              type="email"
              autoComplete="username"
              placeholder="tucorreo@corporativoalpha.com"
              {...register('email')}
              className="input"
            />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
              className="input"
            />
            {errors.password && <p className="field-error">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
            {isSubmitting ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">© Corporativo Alpha · OfficeSpace</p>
      </div>
    </div>
  );
}

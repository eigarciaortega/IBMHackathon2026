import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage } from '../lib/api';
import { ErrorMessage, SuccessMessage } from '../components/ErrorMessage';
import { PageHeader } from '../components/PageHeader';
import { ChangePasswordForm, changePasswordSchema } from '../validators/schemas';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (values: ChangePasswordForm) => {
    setServerError(null);
    try {
      await authService.changePassword(values.currentPassword, values.newPassword);
      await refreshProfile();
      setOk(true);
      setTimeout(() => navigate('/dashboard', { replace: true }), 800);
    } catch (e) {
      setServerError(getApiErrorMessage(e, 'No se pudo cambiar la contraseña.'));
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Cambiar contraseña" subtitle="Actualiza tu credencial de acceso" />
      <form onSubmit={handleSubmit(onSubmit)} className="card card-pad space-y-4">
        <ErrorMessage message={serverError} />
        {ok && <SuccessMessage message="Contraseña actualizada. Redirigiendo…" />}
        <div>
          <label className="label">Contraseña actual</label>
          <input type="password" {...register('currentPassword')} className="input" />
          {errors.currentPassword && <p className="field-error">{errors.currentPassword.message}</p>}
        </div>
        <div>
          <label className="label">Nueva contraseña</label>
          <input type="password" {...register('newPassword')} className="input" />
          {errors.newPassword && <p className="field-error">{errors.newPassword.message}</p>}
        </div>
        <div>
          <label className="label">Confirmar nueva contraseña</label>
          <input type="password" {...register('confirm')} className="input" />
          {errors.confirm && <p className="field-error">{errors.confirm.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
          {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  );
}

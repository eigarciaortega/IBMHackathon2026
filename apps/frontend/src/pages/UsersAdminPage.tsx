import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../services';
import { Spinner } from '../components/Spinner';
import { EmptyState, ErrorMessage } from '../components/ErrorMessage';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { getApiErrorMessage } from '../lib/api';
import { UserForm, userSchema } from '../validators/schemas';
import { UserRecord } from '../types';

export function UsersAdminPage() {
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [toDisable, setToDisable] = useState<UserRecord | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersService.list({ limit: 50 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserForm>({ resolver: zodResolver(userSchema), defaultValues: { role: 'COLLABORATOR' } });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  const createMutation = useMutation({
    mutationFn: (body: UserForm) => usersService.create(body),
    onSuccess: (res) => {
      setTempPassword(res.temporaryPassword);
      reset({ firstName: '', lastName: '', email: '', role: 'COLLABORATOR' });
      void invalidate();
    },
    onError: (e) => setServerError(getApiErrorMessage(e)),
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => usersService.remove(id),
    onSuccess: () => {
      setToDisable(null);
      void invalidate();
    },
    onError: (e) => setServerError(getApiErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" subtitle="Alta y gestión de usuarios" />
      <ErrorMessage message={serverError} />

      {tempPassword && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <span>Usuario creado. Contraseña temporal (mostrar una sola vez):</span>
          <span className="rounded bg-white px-2 py-0.5 font-mono font-semibold text-slate-800">{tempPassword}</span>
          <button onClick={() => setTempPassword(null)} className="ml-auto text-green-700 underline">
            ocultar
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit((v) => {
          setServerError(null);
          createMutation.mutate(v);
        })}
        className="card card-pad grid grid-cols-1 gap-3 sm:grid-cols-5"
      >
        <input placeholder="Nombre" {...register('firstName')} className="input" />
        <input placeholder="Apellido" {...register('lastName')} className="input" />
        <input placeholder="Correo" {...register('email')} className="input" />
        <select {...register('role')} className="select">
          <option value="COLLABORATOR">COLLABORATOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          Crear usuario
        </button>
        {(errors.firstName || errors.lastName || errors.email) && (
          <p className="field-error sm:col-span-5">Revisa los campos obligatorios y el formato del correo.</p>
        )}
      </form>

      {isLoading && <Spinner />}
      {error && <ErrorMessage message={getApiErrorMessage(error)} />}
      {data && data.items.length === 0 && <EmptyState message="No hay usuarios registrados." />}

      {data && data.items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium text-slate-800">
                      {u.firstName} {u.lastName}
                    </td>
                    <td>{u.email}</td>
                    <td>{u.role?.name}</td>
                    <td>
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="text-right">
                      {u.status !== 'INACTIVE' && (
                        <button onClick={() => setToDisable(u)} className="btn btn-ghost btn-sm text-red-600">
                          Desactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDisable}
        title="Desactivar usuario"
        description={toDisable ? `¿Desactivar a ${toDisable.email}? No podrá iniciar sesión.` : ''}
        confirmLabel="Desactivar"
        loading={disableMutation.isPending}
        onConfirm={() => toDisable && disableMutation.mutate(toDisable.id)}
        onCancel={() => setToDisable(null)}
      />
    </div>
  );
}

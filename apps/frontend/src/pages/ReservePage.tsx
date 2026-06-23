import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingsService, spacesService } from '../services';
import { Spinner } from '../components/Spinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { PageHeader } from '../components/PageHeader';
import { getApiErrorMessage } from '../lib/api';
import { BookingForm, bookingSchema } from '../validators/schemas';

export function ReservePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: space, isLoading } = useQuery({
    queryKey: ['space', id],
    queryFn: () => spacesService.get(id),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { spaceId: id, attendeesCount: 1, startTime: '09:00', endTime: '10:00' },
  });

  const checkAvailability = async () => {
    setAvailability(null);
    setServerError(null);
    const v = getValues();
    try {
      const res = await bookingsService.validate({
        spaceId: id,
        date: v.date,
        startTime: v.startTime,
        endTime: v.endTime,
        attendeesCount: Number(v.attendeesCount),
      });
      setAvailability(
        res.available
          ? { ok: true, text: 'Disponible ✓' }
          : { ok: false, text: `No disponible: ${res.reason ?? ''}` },
      );
    } catch (e) {
      setServerError(getApiErrorMessage(e));
    }
  };

  const onSubmit = async (values: BookingForm) => {
    setServerError(null);
    try {
      await bookingsService.create({ ...values, spaceId: id, attendeesCount: Number(values.attendeesCount) });
      navigate('/my-bookings', { replace: true });
    } catch (e) {
      setServerError(getApiErrorMessage(e, 'No se pudo crear la reserva.'));
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Reservar espacio"
        subtitle={space ? `${space.name} · ${space.spaceType} · capacidad ${space.capacity}` : undefined}
      />
      <form onSubmit={handleSubmit(onSubmit)} className="card card-pad space-y-4">
        <ErrorMessage message={serverError} />
        {availability && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              availability.ok
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {availability.text}
          </div>
        )}
        <div>
          <label className="label">Fecha</label>
          <input type="date" {...register('date')} className="input" />
          {errors.date && <p className="field-error">{errors.date.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Inicio</label>
            <input type="time" {...register('startTime')} className="input" />
            {errors.startTime && <p className="field-error">{errors.startTime.message}</p>}
          </div>
          <div>
            <label className="label">Fin</label>
            <input type="time" {...register('endTime')} className="input" />
            {errors.endTime && <p className="field-error">{errors.endTime.message}</p>}
          </div>
        </div>
        <div>
          <label className="label">Asistentes</label>
          <input type="number" min={1} {...register('attendeesCount')} className="input" />
          {errors.attendeesCount && <p className="field-error">{errors.attendeesCount.message}</p>}
        </div>
        <div>
          <label className="label">Motivo</label>
          <input list="purposes" {...register('purpose')} placeholder="Reunión de equipo" className="input" />
          <datalist id="purposes">
            <option value="Reunión de equipo" />
            <option value="Capacitación" />
            <option value="Entrevista" />
            <option value="Trabajo individual" />
            <option value="Presentación" />
          </datalist>
          {errors.purpose && <p className="field-error">{errors.purpose.message}</p>}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={checkAvailability} className="btn btn-secondary">
            Verificar disponibilidad
          </button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting ? 'Reservando…' : 'Confirmar reserva'}
          </button>
        </div>
      </form>
    </div>
  );
}

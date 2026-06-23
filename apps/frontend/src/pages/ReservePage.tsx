import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingsService, spacesService } from '../services';
import { useToast } from '../contexts/ToastContext';
import { Spinner } from '../components/Spinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/PageHeader';
import { getApiErrorMessage } from '../lib/api';
import { BookingForm, bookingSchema } from '../validators/schemas';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function diffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const d = eh * 60 + em - (sh * 60 + sm);
  return d > 0 ? d : 60;
}

export function ReservePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const TODAY = todayISO();
  const [serverError, setServerError] = useState<string | null>(null);
  const [availMsg, setAvailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recEnd, setRecEnd] = useState('');
  const [recFreq, setRecFreq] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');

  const { data: space, isLoading } = useQuery({
    queryKey: ['space', id],
    queryFn: () => spacesService.get(id),
    enabled: !!id,
  });
  const capacity = space?.capacity ?? 1;

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { spaceId: id, attendeesCount: 1, startTime: '09:00', endTime: '10:00', date: '' },
  });

  const date = watch('date');
  const startTime = watch('startTime');
  const endTime = watch('endTime');
  const attendees = Number(watch('attendeesCount') || 0);
  const overCapacity = space ? attendees > capacity : false;
  const duration = diffMinutes(startTime || '09:00', endTime || '10:00');

  // Horarios disponibles (PARTE 4)
  const { data: slots, isFetching: loadingSlots } = useQuery({
    queryKey: ['availability', id, date, duration],
    queryFn: () => bookingsService.availability(id, date, duration),
    enabled: !!id && !!date,
  });

  const pickSlot = (s: { startTime: string; endTime: string }) => {
    setValue('startTime', s.startTime, { shouldValidate: true });
    setValue('endTime', s.endTime, { shouldValidate: true });
    setAvailMsg(null);
  };

  const isPastSelection = (): boolean => {
    if (!date) return false;
    if (date < TODAY) return true;
    if (date === TODAY && startTime && startTime <= nowHHMM()) return true;
    return false;
  };

  const checkAvailability = async () => {
    setAvailMsg(null);
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
      setAvailMsg(
        res.available
          ? { ok: true, text: '✓ Disponible para ese horario' }
          : { ok: false, text: `No disponible: ${res.reason ?? ''}` },
      );
    } catch (e) {
      setServerError(getApiErrorMessage(e));
    }
  };

  const onSubmit = async (values: BookingForm) => {
    setServerError(null);
    if (space && Number(values.attendeesCount) > capacity) {
      const m = `La capacidad máxima de "${space.name}" es ${capacity} personas.`;
      setServerError(m);
      toast.error(m);
      return;
    }
    if (isPastSelection()) {
      const m = 'No puedes reservar en horarios pasados.';
      setServerError(m);
      toast.warning(m);
      return;
    }
    if (isRecurring) {
      if (!recEnd) {
        setServerError('Indica la fecha de fin de la recurrencia.');
        return;
      }
      if (recEnd < values.date) {
        setServerError('La fecha de fin debe ser igual o posterior a la de inicio.');
        return;
      }
    }
    try {
      const res = await bookingsService.create({
        ...values,
        spaceId: id,
        attendeesCount: Number(values.attendeesCount),
        isRecurring,
        ...(isRecurring
          ? {
              recurrenceStartDate: values.date,
              recurrenceEndDate: recEnd,
              recurrenceFrequency: recFreq,
            }
          : {}),
      });
      const pending = (res as { status?: string })?.status === 'PENDING_APPROVAL';
      if (pending) {
        toast.info('Solicitud recurrente enviada para aprobación.');
      } else {
        toast.success('Reserva creada correctamente.');
      }
      navigate('/my-bookings', {
        replace: true,
        state: pending ? { msg: 'Tu solicitud recurrente se envió al administrador para aprobación.' } : undefined,
      });
    } catch (e) {
      const m = getApiErrorMessage(e, 'No se pudo crear la reserva.');
      setServerError(m);
      toast.error(m);
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Reservar espacio" subtitle="Confirma los datos y reserva en segundos" />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
        {/* Resumen del espacio */}
        <aside className="md:col-span-2">
          {space && (
            <div className="card card-pad">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-graphite-900">{space.name}</h3>
                <StatusBadge status={space.status} />
              </div>
              <p className="mt-0.5 text-sm text-graphite-500">{space.spaceType}</p>
              <div className="mt-4 rounded-xl bg-teal-50 p-3 text-center">
                <div className="text-2xl font-bold text-teal-700">{capacity}</div>
                <div className="text-[11px] uppercase tracking-wide text-teal-600">capacidad máxima (personas)</div>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-graphite-500">Piso</dt><dd className="font-medium text-graphite-800">{space.floor}</dd></div>
                <div className="flex justify-between"><dt className="text-graphite-500">Zona</dt><dd className="font-medium text-graphite-800">{space.zone}</dd></div>
              </dl>
              {space.spaceResources && space.spaceResources.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1 text-xs text-graphite-400">Recursos</div>
                  <div className="flex flex-wrap gap-1.5">
                    {space.spaceResources.map((r) => (
                      <span key={r.resource.id} className="rounded-md bg-graphite-100 px-2 py-0.5 text-[11px] font-medium text-graphite-600">{r.resource.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="card card-pad space-y-4 md:col-span-3">
          <ErrorMessage message={serverError} />
          {availMsg && (
            <div className={`rounded-lg border px-3 py-2 text-sm ${availMsg.ok ? 'border-mint-200 bg-mint-50 text-mint-500' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              {availMsg.text}
            </div>
          )}

          <div>
            <label className="label">{isRecurring ? 'Fecha de inicio' : 'Fecha'}</label>
            <input type="date" min={TODAY} {...register('date')} className="input" />
            {errors.date && <p className="field-error">{errors.date.message}</p>}
            {isPastSelection() && <p className="field-error">No puedes reservar en horarios pasados.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Inicio</label>
              <input type="time" min={date === TODAY ? nowHHMM() : undefined} {...register('startTime')} className="input" />
              {errors.startTime && <p className="field-error">{errors.startTime.message}</p>}
            </div>
            <div>
              <label className="label">Fin</label>
              <input type="time" {...register('endTime')} className="input" />
              {errors.endTime && <p className="field-error">{errors.endTime.message}</p>}
            </div>
          </div>

          {/* Horarios sugeridos */}
          {date && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label mb-0">Horarios sugeridos ({duration} min)</span>
                {loadingSlots && <span className="text-xs text-graphite-400">cargando…</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {(slots ?? []).filter((s) => s.available).slice(0, 12).map((s) => (
                  <button
                    type="button"
                    key={s.startTime}
                    onClick={() => pickSlot(s)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      startTime === s.startTime && endTime === s.endTime
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-graphite-200 bg-white text-graphite-700 hover:border-teal-300 hover:bg-teal-50'
                    }`}
                  >
                    {s.startTime}–{s.endTime}
                  </button>
                ))}
                {!loadingSlots && (slots ?? []).filter((s) => s.available).length === 0 && (
                  <span className="text-sm text-graphite-400">No hay horarios libres para esa fecha/duración.</span>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="label">Asistentes (máx. {capacity})</label>
            <input type="number" min={1} max={capacity} {...register('attendeesCount')} className="input" />
            {errors.attendeesCount && <p className="field-error">{errors.attendeesCount.message}</p>}
            {overCapacity && <p className="field-error">Supera la capacidad máxima de {capacity} personas.</p>}
          </div>

          <div>
            <label className="label">Motivo</label>
            <input list="purposes" {...register('purpose')} placeholder="Reunión de equipo" className="input" />
            <datalist id="purposes">
              <option value="Reunión de equipo" /><option value="Capacitación" /><option value="Entrevista" /><option value="Trabajo individual" /><option value="Presentación" />
            </datalist>
            {errors.purpose && <p className="field-error">{errors.purpose.message}</p>}
          </div>

          {/* Reserva recurrente */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-graphite-200 bg-graphite-50 p-3">
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="mt-0.5 h-4 w-4 accent-teal-600" />
            <span className="text-sm">
              <span className="font-medium text-graphite-800">Hacer esta reserva recurrente</span>
              <span className="block text-xs text-graphite-500">Se enviará al administrador para aprobación. No queda confirmada hasta ser aprobada.</span>
            </span>
          </label>

          {isRecurring && (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-graphite-200 p-3 sm:grid-cols-2">
              <div>
                <label className="label">Hasta (fin de recurrencia)</label>
                <input type="date" min={date || TODAY} value={recEnd} onChange={(e) => setRecEnd(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Frecuencia</label>
                <select value={recFreq} onChange={(e) => setRecFreq(e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY')} className="select">
                  <option value="DAILY">Diaria</option>
                  <option value="WEEKLY">Semanal</option>
                  <option value="MONTHLY">Mensual</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={checkAvailability} className="btn btn-secondary" disabled={isRecurring}>
              Verificar disponibilidad
            </button>
            <button type="submit" disabled={isSubmitting || overCapacity} className="btn btn-primary">
              {isSubmitting ? 'Enviando…' : isRecurring ? 'Enviar solicitud recurrente' : 'Confirmar reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

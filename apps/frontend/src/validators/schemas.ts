import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Obligatoria'),
    newPassword: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/(?=.*[A-Z])(?=.*\d)/, 'Debe incluir una mayúscula y un número'),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  });
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export const bookingSchema = z.object({
  spaceId: z.string().uuid('Selecciona un espacio'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha requerida'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inicio inválida'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora fin inválida'),
  attendeesCount: z.coerce.number().int().min(1, 'Mínimo 1 asistente'),
  purpose: z.string().min(1, 'El motivo es obligatorio'),
});
export type BookingForm = z.infer<typeof bookingSchema>;

export const userSchema = z.object({
  firstName: z.string().min(1, 'Obligatorio'),
  lastName: z.string().min(1, 'Obligatorio'),
  email: z.string().email('Correo inválido'),
  role: z.enum(['ADMIN', 'COLLABORATOR']),
});
export type UserForm = z.infer<typeof userSchema>;

export const spaceSchema = z.object({
  name: z.string().min(1, 'Obligatorio'),
  spaceType: z.string().min(1, 'Obligatorio'),
  capacity: z.coerce.number().int().min(1, 'Capacidad > 0'),
  floor: z.string().min(1, 'Obligatorio'),
  zone: z.string().min(1, 'Obligatorio'),
  description: z.string().optional(),
});
export type SpaceForm = z.infer<typeof spaceSchema>;

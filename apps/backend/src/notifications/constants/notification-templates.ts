/**
 * Plantillas de notificaciones internas (decisión H-07).
 * Eventos soportados: reserva creada/cancelada, espacio desactivado/mantenimiento,
 * usuario desactivado. Sin email/push/WebSockets.
 */
export const NotificationTemplates = {
  bookingCreated: (spaceName: string, date: string, startTime: string) => ({
    title: 'Reserva creada',
    message: `Tu reserva de "${spaceName}" para el ${date} a las ${startTime} fue confirmada.`,
  }),
  bookingCancelled: (spaceName: string, date: string, startTime: string) => ({
    title: 'Reserva cancelada',
    message: `Tu reserva de "${spaceName}" del ${date} a las ${startTime} fue cancelada.`,
  }),
  spaceDeactivated: (spaceName: string) => ({
    title: 'Espacio desactivado',
    message: `El espacio "${spaceName}" fue desactivado.`,
  }),
  spaceMaintenance: (spaceName: string) => ({
    title: 'Espacio en mantenimiento',
    message: `El espacio "${spaceName}" pasó a mantenimiento.`,
  }),
  userDeactivated: () => ({
    title: 'Cuenta desactivada',
    message: 'Tu usuario fue desactivado. Contacta al administrador.',
  }),
} as const;

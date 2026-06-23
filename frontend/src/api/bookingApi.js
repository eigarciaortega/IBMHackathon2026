// Cliente del booking-service.
//
// Envuelve los endpoints de disponibilidad, creación/consulta/cancelación de
// Reservas sobre el cliente HTTP centralizado. Lo consumen el Panel de búsqueda
// (tarea 9.3), la Confirmación de reserva (tarea 9.4) y "Mis Reservas".

import { request } from './httpClient';
import { SERVICE_URLS } from './config';

/**
 * Busca disponibilidad de Espacios para un rango y filtros (R5.x).
 * @param {{ fecha: string, horaInicio: string, horaFin: string, tipo?: string, capacidadMin?: number }} criterios
 */
export function buscarDisponibilidad(criterios) {
  const params = new URLSearchParams();
  if (criterios.fecha) params.set('fecha', criterios.fecha);
  if (criterios.horaInicio) params.set('horaInicio', criterios.horaInicio);
  if (criterios.horaFin) params.set('horaFin', criterios.horaFin);
  if (criterios.tipo) params.set('tipo', criterios.tipo);
  if (criterios.capacidadMin != null) params.set('capacidadMin', String(criterios.capacidadMin));
  if (Array.isArray(criterios.recursos) && criterios.recursos.length > 0) {
    params.set('recursos', criterios.recursos.join(','));
  }
  const qs = params.toString();
  return request(SERVICE_URLS.booking, `/disponibilidad${qs ? `?${qs}` : ''}`);
}

/** Crea una Reserva (COLABORADOR) (R6.1). */
export function crearReserva(reserva) {
  return request(SERVICE_URLS.booking, '/reservas', { method: 'POST', body: reserva });
}

/** Devuelve las Reservas del solicitante (R7.1). */
export function misReservas() {
  return request(SERVICE_URLS.booking, '/reservas/mias');
}

/** Edita una Reserva propia futura (rango y/o asistentes). */
export function actualizarReserva(id, reserva) {
  return request(SERVICE_URLS.booking, `/reservas/${id}`, { method: 'PUT', body: reserva });
}

/** Devuelve TODAS las Reservas del corporativo (ADMINISTRADOR). */
export function todasLasReservas() {
  return request(SERVICE_URLS.booking, '/reservas');
}

/** Cancela una Reserva propia futura (R7.3). */
export function cancelarReserva(id) {
  return request(SERVICE_URLS.booking, `/reservas/${id}`, { method: 'DELETE' });
}

import { peticion, URLS } from '../lib/api'
import type { CrearReservaInput, Disponibilidad, Reserva } from '../types'

export const bookingApi = {
  crear(input: CrearReservaInput) {
    return peticion<Reserva>(URLS.booking, '/bookings', { method: 'POST', body: input })
  },
  misReservas() {
    return peticion<Reserva[]>(URLS.booking, '/bookings/mine')
  },
  disponibilidad(espacioId: number, fecha: string, inicio: string, fin: string) {
    const params = new URLSearchParams({
      espacio_id: String(espacioId),
      fecha,
      inicio,
      fin,
    })
    return peticion<Disponibilidad>(URLS.booking, `/bookings/availability?${params}`)
  },
  ocupacion(fecha: string) {
    return peticion<Reserva[]>(URLS.booking, `/occupancy?fecha=${fecha}`)
  },
  cancelar(id: number) {
    return peticion<Reserva>(URLS.booking, `/bookings/${id}`, { method: 'DELETE' })
  },
}

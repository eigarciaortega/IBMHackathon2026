/**
 * Capa de servicios API. Cada función corresponde a un endpoint REST.
 */
import { api, setToken } from './client'

// ---- Auth ----
export async function login(email, password) {
  const r = await api.auth('/auth/login', { method: 'POST', body: { email, password }, auth: false })
  setToken(r.token)
  return r
}
export const fetchMe = () => api.auth('/auth/me')
export const listUsers = () => api.auth('/auth/users')

// ---- Espacios (catalog-service) ----
export const listSpaces = (params) => api.catalog('/spaces', { params })
export const getSpace = (id) => api.catalog(`/spaces/${id}`)
export const createSpace = (body) => api.catalog('/spaces', { method: 'POST', body })
export const updateSpace = (id, body) => api.catalog(`/spaces/${id}`, { method: 'PUT', body })
export const deleteSpace = (id) => api.catalog(`/spaces/${id}`, { method: 'DELETE' })

// ---- Reservas (booking-service) ----
export const searchAvailability = (params) => api.booking('/availability', { params })
export const createBooking = (body) => api.booking('/bookings', { method: 'POST', body })
export const myBookings = () => api.booking('/bookings/me')
export const cancelBooking = (id) => api.booking(`/bookings/${id}`, { method: 'DELETE' })
export const fetchOccupancy = (date) => api.booking('/bookings/occupancy', { params: { date } })
export const fetchAnalytics = () => api.booking('/bookings/analytics')
export const fetchSuggestions = (params) => api.booking('/bookings/suggestions', { params })

export { setToken, getToken } from './client'
export { ApiError } from './client'

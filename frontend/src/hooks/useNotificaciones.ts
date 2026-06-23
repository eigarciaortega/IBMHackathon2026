import { useContext } from 'react'
import { NotificationsContext } from '../context/notifications-context'

export function useNotificaciones() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotificaciones debe usarse dentro de NotificationsProvider')
  }
  return ctx
}

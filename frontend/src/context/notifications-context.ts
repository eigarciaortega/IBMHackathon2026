import { createContext } from 'react'
import type { Notificacion } from '../types'

export interface NotificacionesState {
  notificaciones: Notificacion[]
  noLeidas: number
  // true mientras el flujo SSE está abierto (indicador "en vivo").
  conectado: boolean
  marcarLeidas: () => Promise<void>
}

export const NotificationsContext = createContext<NotificacionesState | undefined>(undefined)

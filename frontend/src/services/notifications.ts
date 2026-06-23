import { peticion, URLS } from '../lib/api'
import type { ListaNotificaciones } from '../types'

export const notificationsApi = {
  listar() {
    return peticion<ListaNotificaciones>(URLS.booking, '/notifications')
  },
  marcarLeidas() {
    return peticion<void>(URLS.booking, '/notifications/read', { method: 'POST' })
  },
  // EventSource no permite headers, por eso el token viaja como query param.
  urlStream(token: string) {
    return `${URLS.booking}/notifications/stream?token=${encodeURIComponent(token)}`
  },
}

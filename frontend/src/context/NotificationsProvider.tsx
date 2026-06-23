// Centro de notificaciones del administrador. Carga el historial y abre un flujo
// SSE en tiempo real; cada evento entrante suma al contador y lanza un toast.
// Para colaboradores el proveedor queda inerte (no consulta ni se suscribe).
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { notificationsApi } from '../services/notifications'
import { toast } from '../lib/toast'
import type { Notificacion } from '../types'
import { NotificationsContext } from './notifications-context'

const LIMITE = 50

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { token, usuario } = useAuth()
  const esAdmin = usuario?.rol === 'ADMINISTRADOR'

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [conectado, setConectado] = useState(false)

  // Carga inicial del historial (solo admin).
  useEffect(() => {
    if (!esAdmin || !token) {
      setNotificaciones([])
      setNoLeidas(0)
      return
    }
    let activo = true
    notificationsApi
      .listar()
      .then((d) => {
        if (!activo) return
        setNotificaciones(d.notificaciones)
        setNoLeidas(d.no_leidas)
      })
      .catch(() => {})
    return () => {
      activo = false
    }
  }, [esAdmin, token])

  // Suscripción en tiempo real por SSE (solo admin).
  useEffect(() => {
    if (!esAdmin || !token) return
    const fuente = new EventSource(notificationsApi.urlStream(token))

    fuente.onopen = () => setConectado(true)
    fuente.addEventListener('notificacion', (e) => {
      try {
        const n = JSON.parse((e as MessageEvent).data) as Notificacion
        setNotificaciones((prev) =>
          prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, LIMITE),
        )
        setNoLeidas((c) => c + 1)
        toast.info(n.mensaje)
      } catch {
        // Ignora payloads mal formados.
      }
    })
    // En errores de red EventSource reintenta solo; ante un fallo de auth cierra.
    fuente.onerror = () => setConectado(false)

    return () => fuente.close()
  }, [esAdmin, token])

  const marcarLeidas = useCallback(async () => {
    setNoLeidas(0)
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
    try {
      await notificationsApi.marcarLeidas()
    } catch {
      // Si falla, el próximo refresco reconciliará el estado.
    }
  }, [])

  return (
    <NotificationsContext.Provider value={{ notificaciones, noLeidas, conectado, marcarLeidas }}>
      {children}
    </NotificationsContext.Provider>
  )
}

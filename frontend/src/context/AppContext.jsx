/**
 * Contexto de toasts (avisos efímeros). La sesión y los datos del usuario
 * viven en AuthContext; aquí solo gestionamos notificaciones de UI.
 */
import { createContext, useCallback, useContext, useState } from 'react'

const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

export function AppProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback((opts) => {
    const id = Math.random().toString(36).slice(2)
    const item = { id, type: 'info', title: '', message: '', ...(typeof opts === 'string' ? { title: opts } : opts) }
    setToasts((t) => [...t, item])
    setTimeout(() => dismiss(id), item.duration || 4500)
    return id
  }, [dismiss])

  return <AppCtx.Provider value={{ toast, toasts, dismiss }}>{children}</AppCtx.Provider>
}

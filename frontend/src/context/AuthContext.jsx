/**
 * Sesión del usuario: token JWT + datos del usuario. Persiste en localStorage
 * y configura el cliente API para adjuntar el token. Maneja 401 → logout.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as api from '../api/client'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

const LS_TOKEN = 'neowallet.token'
const LS_USER = 'neowallet.user'

export function AuthProvider({ children }) {
  const [token, setTok] = useState(() => localStorage.getItem(LS_TOKEN) || null)
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_USER)) } catch { return null }
  })
  const [ready, setReady] = useState(false)

  const logout = useCallback(() => {
    setTok(null); setUser(null)
    api.setToken(null)
    localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_USER)
  }, [])

  // Configura el cliente con el token actual y el manejador de 401.
  useEffect(() => { api.setToken(token) }, [token])
  useEffect(() => { api.setUnauthorizedHandler(() => logout()) }, [logout])

  // Al cargar con token guardado, revalida contra /auth/me (saldo fresco).
  useEffect(() => {
    let alive = true
    if (!token) { setReady(true); return }
    api.setToken(token)
    api.me()
      .then((u) => { if (alive) { setUser(u); localStorage.setItem(LS_USER, JSON.stringify(u)) } })
      .catch(() => { if (alive) logout() })
      .finally(() => alive && setReady(true))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = (t, u) => {
    setTok(t); setUser(u)
    api.setToken(t)
    localStorage.setItem(LS_TOKEN, t)
    localStorage.setItem(LS_USER, JSON.stringify(u))
  }

  const login = useCallback(async (email, password) => {
    const r = await api.login(email, password)
    persist(r.token, r.user)
    return r.user
  }, [])

  const register = useCallback(async (body) => {
    const r = await api.register(body)
    persist(r.token, r.user)
    return r.user
  }, [])

  // Refresca el usuario (p.ej. tras recargar o transferir).
  const refreshUser = useCallback(async () => {
    try {
      const u = await api.me()
      setUser(u); localStorage.setItem(LS_USER, JSON.stringify(u))
      return u
    } catch { return null }
  }, [])

  return (
    <AuthCtx.Provider value={{ token, user, ready, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthCtx.Provider>
  )
}

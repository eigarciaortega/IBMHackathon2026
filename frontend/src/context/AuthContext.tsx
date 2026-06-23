import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '../services/auth'
import { fijarManejadorDeExpiracion, fijarToken } from '../lib/api'
import type { Usuario } from '../types'
import { AuthContext } from './auth-context'

const CLAVE_TOKEN = 'officespace_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(CLAVE_TOKEN))
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  const logout = useCallback(() => {
    setToken(null)
    setUsuario(null)
    fijarToken(null)
    sessionStorage.removeItem(CLAVE_TOKEN)
  }, [])

  // Cierra la sesión automáticamente cuando cualquier API devuelve 401.
  useEffect(() => {
    fijarManejadorDeExpiracion(logout)
  }, [logout])

  // Rehidrata la sesión al cargar: valida el token guardado contra /auth/me.
  useEffect(() => {
    const guardado = sessionStorage.getItem(CLAVE_TOKEN)
    if (!guardado) {
      setCargando(false)
      return
    }
    fijarToken(guardado)
    authApi
      .me()
      .then((u) => {
        setUsuario(u)
        setToken(guardado)
      })
      .catch(() => logout())
      .finally(() => setCargando(false))
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const { token: nuevo } = await authApi.login(email, password)
    fijarToken(nuevo)
    sessionStorage.setItem(CLAVE_TOKEN, nuevo)
    const u = await authApi.me()
    setToken(nuevo)
    setUsuario(u)
  }, [])

  return (
    <AuthContext.Provider value={{ usuario, token, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

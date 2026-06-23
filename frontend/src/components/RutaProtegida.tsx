// Rutas protegidas: exigen sesión y, opcionalmente, un rol concreto.
import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { Rol } from '../types'
import { CargandoBloque } from './ui'

export function RutaProtegida({ children, rol }: { children: ReactNode; rol?: Rol }) {
  const { usuario, cargando } = useAuth()
  const location = useLocation()

  if (cargando) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <CargandoBloque texto="Verificando sesión…" />
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Un colaborador que intenta entrar a una ruta de admin va a su pantalla base.
  if (rol && usuario.rol !== rol) {
    return <Navigate to="/buscar" replace />
  }

  return <>{children}</>
}

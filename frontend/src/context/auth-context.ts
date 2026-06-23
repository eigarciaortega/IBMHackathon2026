import { createContext } from 'react'
import type { Usuario } from '../types'

export interface AuthState {
  usuario: Usuario | null
  token: string | null
  cargando: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthState | undefined>(undefined)

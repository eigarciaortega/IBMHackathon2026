import { createContext } from 'react'
import type { Tema } from '../lib/tema'

export interface TemaState {
  tema: Tema
  alternar: () => void
}

export const ThemeContext = createContext<TemaState | undefined>(undefined)

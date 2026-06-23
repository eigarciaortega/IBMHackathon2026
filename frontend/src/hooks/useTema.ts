import { useContext } from 'react'
import { ThemeContext } from '../context/theme-context'

export function useTema() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTema debe usarse dentro de ThemeProvider')
  }
  return ctx
}

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { aplicarTema, temaInicial, type Tema } from '../lib/tema'
import { ThemeContext } from './theme-context'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial)

  // Mantiene la clase de <html> sincronizada con el estado.
  useEffect(() => {
    aplicarTema(tema)
  }, [tema])

  const alternar = useCallback(() => {
    setTema((t) => (t === 'oscuro' ? 'claro' : 'oscuro'))
  }, [])

  return <ThemeContext.Provider value={{ tema, alternar }}>{children}</ThemeContext.Provider>
}

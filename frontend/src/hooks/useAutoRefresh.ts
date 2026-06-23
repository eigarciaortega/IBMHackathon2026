// Hooks para mantener los datos frescos sin recargar la página:
//  - useRefrescoAlEnfocar: refresca cuando la pestaña vuelve a estar visible.
//  - useIntervalo: sondea cada N ms (solo si la pestaña está visible).
import { useEffect, useRef } from 'react'

export function useRefrescoAlEnfocar(fn: () => void) {
  const ref = useRef(fn)
  useEffect(() => {
    ref.current = fn
  })
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') ref.current()
    }
    window.addEventListener('focus', alVolver)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.removeEventListener('focus', alVolver)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [])
}

export function useIntervalo(fn: () => void, ms: number, activo = true) {
  const ref = useRef(fn)
  useEffect(() => {
    ref.current = fn
  })
  useEffect(() => {
    if (!activo) return
    const id = setInterval(() => {
      // No malgastar peticiones cuando la pestaña está oculta.
      if (document.visibilityState === 'visible') ref.current()
    }, ms)
    return () => clearInterval(id)
  }, [ms, activo])
}

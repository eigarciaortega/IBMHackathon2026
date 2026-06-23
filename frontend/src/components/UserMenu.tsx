// Menú de usuario: el avatar es el disparador; al pulsarlo se abre un panel con el
// nombre, el rol y la acción de cerrar sesión. Se cierra al hacer clic fuera o Esc.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { IconSalir } from './icons'

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/)
  if (partes.length === 0 || !partes[0]) return '·'
  const a = partes[0][0] ?? ''
  const b = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (a + b).toUpperCase()
}

export function UserMenu() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const esAdmin = usuario?.rol === 'ADMINISTRADOR'

  useEffect(() => {
    if (!abierto) return
    function alClic(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    function alTecla(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', alClic)
    document.addEventListener('keydown', alTecla)
    return () => {
      document.removeEventListener('mousedown', alClic)
      document.removeEventListener('keydown', alTecla)
    }
  }, [abierto])

  function salir() {
    setAbierto(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="grid size-9 place-items-center rounded-full bg-azul-soft text-sm font-semibold text-azul-strong transition-shadow hover:shadow-sutil focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Menú de usuario"
      >
        {iniciales(usuario?.nombre ?? '')}
      </button>

      {abierto && (
        <div
          role="menu"
          className="anim-aparecer absolute right-0 mt-2 w-56 overflow-hidden rounded-[0.75rem] border border-border bg-surface shadow-xl"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium text-ink">{usuario?.nombre}</p>
            <p className="truncate text-xs text-muted">{usuario?.email}</p>
            <span className="mt-1.5 inline-block rounded-full bg-azul-soft px-2 py-0.5 text-[0.7rem] font-medium text-azul-strong">
              {esAdmin ? 'Administrador' : 'Colaborador'}
            </span>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={salir}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-peligro transition-colors hover:bg-peligro-soft"
          >
            <IconSalir className="size-[18px]" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

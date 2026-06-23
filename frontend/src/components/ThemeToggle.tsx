// Botón para alternar entre tema claro y oscuro. Muestra el icono del tema al que
// se cambiará (luna en claro, sol en oscuro).
import { useTema } from '../hooks/useTema'
import { IconLuna, IconSol } from './icons'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { tema, alternar } = useTema()
  const oscuro = tema === 'oscuro'
  return (
    <button
      type="button"
      onClick={alternar}
      className={`btn-ghost btn-sm ${className}`}
      aria-label={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={oscuro ? 'Tema claro' : 'Tema oscuro'}
    >
      {oscuro ? <IconSol className="size-[18px]" /> : <IconLuna className="size-[18px]" />}
    </button>
  )
}

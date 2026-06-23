// Conjunto de iconos en SVG en línea (sin dependencias). Heredan el color con
// currentColor y el tamaño con la prop className.
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

function Base({ children, ...props }: P & { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconBuscar = (p: P) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Base>
)
export const IconCalendario = (p: P) => (
  <Base {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v3M16 3v3" />
  </Base>
)
export const IconReloj = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Base>
)
export const IconUsuarios = (p: P) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.2a3.2 3.2 0 0 1 0 6M17.5 19a5.5 5.5 0 0 0-2.5-4.6" />
  </Base>
)
export const IconProyector = (p: P) => (
  <Base {...p}>
    <rect x="3" y="8" width="18" height="9" rx="2" />
    <circle cx="14" cy="12.5" r="2.5" />
    <path d="M7 8V6h4M7 17v1.5M17 17v1.5" />
  </Base>
)
export const IconAire = (p: P) => (
  <Base {...p}>
    <path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" />
  </Base>
)
export const IconSala = (p: P) => (
  <Base {...p}>
    <path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16M4 21h16M14 12h.01" />
  </Base>
)
export const IconDesk = (p: P) => (
  <Base {...p}>
    <rect x="3" y="4.5" width="18" height="11" rx="2" />
    <path d="M8 20h8M12 15.5V20" />
  </Base>
)
export const IconMas = (p: P) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
)
export const IconEditar = (p: P) => (
  <Base {...p}>
    <path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L4 18.5V20z" />
    <path d="M14 7l3 3" />
  </Base>
)
export const IconBasura = (p: P) => (
  <Base {...p}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </Base>
)
export const IconCheck = (p: P) => (
  <Base {...p}>
    <path d="m5 13 4 4L19 7" />
  </Base>
)
export const IconAlerta = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5M12 16h.01" />
  </Base>
)
export const IconChevron = (p: P) => (
  <Base {...p}>
    <path d="m6 9 6 6 6-6" />
  </Base>
)
export const IconSalir = (p: P) => (
  <Base {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />
  </Base>
)
export const IconReservas = (p: P) => (
  <Base {...p}>
    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
  </Base>
)
export const IconAdmin = (p: P) => (
  <Base {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
    <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
    <circle cx="8" cy="18" r="2" fill="currentColor" stroke="none" />
  </Base>
)
export const IconPiso = (p: P) => (
  <Base {...p}>
    <path d="M3 21h18M6 21V8l6-4 6 4v13M10 21v-5h4v5" />
  </Base>
)
export const IconCerrar = (p: P) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
)
export const IconInfo = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Base>
)
export const IconCampana = (p: P) => (
  <Base {...p}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Base>
)

// Marca: franjas de una jornada reservada (evoca la pista de ocupación). El tono
// 'marca' (azul) va sobre fondos claros; 'claro' (azulejo blanco) sobre fondos
// oscuros como el panel del login.
export const Logo = ({ tono = 'marca', ...p }: P & { tono?: 'marca' | 'claro' }) => {
  const azulejo = tono === 'claro' ? '#ffffff' : '#1b50b3'
  const franja = tono === 'claro' ? '#1b50b3' : '#ffffff'
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" {...p}>
      <rect width="32" height="32" rx="8" fill={azulejo} />
      <rect x="7" y="9" width="13" height="3.6" rx="1.8" fill={franja} />
      <rect x="12" y="14.2" width="13" height="3.6" rx="1.8" fill="#f0a64e" />
      <rect x="7" y="19.4" width="9" height="3.6" rx="1.8" fill={franja} fillOpacity="0.85" />
    </svg>
  )
}

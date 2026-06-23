// Página Acerca de (pública). Crédito del evento y resumen del proyecto.
import { Link } from 'react-router-dom'
import { IconChevron, Logo } from '../components/icons'

export function AboutPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-body"
        >
          <IconChevron className="size-4 rotate-90" />
          Volver al inicio
        </Link>

        <div className="card overflow-hidden">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#16357a] to-[#0f2657] px-7 py-8 text-white">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                backgroundSize: '30px 30px',
                maskImage: 'radial-gradient(120% 90% at 20% 0%, #000 40%, transparent 100%)',
              }}
            />
            <div className="relative flex items-center gap-2.5">
              <Logo tono="claro" />
              <span className="text-lg font-semibold tracking-tight">OfficeSpace</span>
            </div>
            <h1 className="relative mt-5 text-2xl font-semibold text-white">
              Gestión híbrida de espacios
            </h1>
            <p className="relative mt-2 max-w-sm text-pretty text-sm leading-relaxed text-white/80">
              Búsqueda de disponibilidad, motor de reservas sin solapamiento y panel
              de ocupación, con microservicios en Go y una SPA en React.
            </p>
          </div>

          <dl className="divide-y divide-border">
            <Fila termino="Evento" detalle="Hackathon IBM Consulting" />
            <Fila termino="Fecha" detalle="Junio 2026" />
            <Fila termino="Cliente" detalle="Corporativo Alpha" />
          </dl>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Hackathon IBM Consulting · Junio 2026
        </p>
      </div>
    </div>
  )
}

function Fila({ termino, detalle }: { termino: string; detalle: string }) {
  return (
    <div className="flex items-center justify-between px-7 py-4">
      <dt className="text-sm text-muted">{termino}</dt>
      <dd className="text-sm font-medium text-body">{detalle}</dd>
    </div>
  )
}

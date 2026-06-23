// Elemento "firma" de OfficeSpace: una pista horizontal que representa la jornada
// laboral (por defecto 07:00–21:00) con segmentos azules para las franjas
// ocupadas. Se reutiliza en los resultados de búsqueda y en el dashboard de
// ocupación, dando una identidad visual coherente y legible de un vistazo.
import { horaAMinutos } from '../lib/format'

interface Franja {
  inicio: string
  fin: string
  etiqueta?: string
}

interface Props {
  franjas: Franja[]
  // Franja opcional que el usuario está evaluando (se dibuja en ámbar punteado).
  tentativa?: Franja
  inicioJornada?: string
  finJornada?: string
  alto?: number
  mostrarHoras?: boolean
  // 'claro' sobre superficies blancas; 'oscuro' sobre el panel de marca.
  variante?: 'claro' | 'oscuro'
}

const ESTILOS = {
  claro: {
    pista: 'bg-surface-muted ring-1 ring-inset ring-border',
    guia: 'bg-border/70',
    ocupado: 'bg-azul',
    horas: 'text-muted',
  },
  oscuro: {
    pista: 'bg-white/10 ring-1 ring-inset ring-white/15',
    guia: 'bg-white/15',
    ocupado: 'bg-white/85',
    horas: 'text-white/70',
  },
} as const

export function OccupancyTrack({
  franjas,
  tentativa,
  inicioJornada = '07:00',
  finJornada = '21:00',
  alto = 28,
  mostrarHoras = true,
  variante = 'claro',
}: Props) {
  const min0 = horaAMinutos(inicioJornada)
  const min1 = horaAMinutos(finJornada)
  const total = Math.max(1, min1 - min0)
  const s = ESTILOS[variante]

  const pct = (hhmm: string) => ((horaAMinutos(hhmm) - min0) / total) * 100
  const ancho = (i: string, f: string) => Math.max(0, pct(f) - pct(i))

  // Marcas cada 2 horas para orientación.
  const marcas: string[] = []
  for (let m = min0; m <= min1; m += 120) {
    marcas.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:00`)
  }

  return (
    <div className="w-full">
      <div
        className={`relative w-full overflow-hidden rounded-md ${s.pista}`}
        style={{ height: alto }}
        role="img"
        aria-label={
          franjas.length
            ? `Ocupado en ${franjas.map((f) => `${f.inicio} a ${f.fin}`).join(', ')}`
            : 'Sin reservas en la jornada'
        }
      >
        {/* Líneas guía por hora par */}
        {marcas.map((m) => (
          <div
            key={m}
            className={`absolute top-0 bottom-0 w-px ${s.guia}`}
            style={{ left: `${pct(m)}%` }}
          />
        ))}

        {/* Franjas ocupadas */}
        {franjas.map((f, i) => (
          <div
            key={`${f.inicio}-${f.fin}-${i}`}
            className={`absolute top-1 bottom-1 rounded-[3px] ${s.ocupado}`}
            style={{ left: `${pct(f.inicio)}%`, width: `${ancho(f.inicio, f.fin)}%` }}
            title={f.etiqueta ?? `${f.inicio}–${f.fin}`}
          />
        ))}

        {/* Franja tentativa (la que el usuario evalúa) */}
        {tentativa && ancho(tentativa.inicio, tentativa.fin) > 0 && (
          <div
            className="absolute top-1 bottom-1 rounded-[3px] border-2 border-dashed border-ambar bg-ambar/20"
            style={{
              left: `${pct(tentativa.inicio)}%`,
              width: `${ancho(tentativa.inicio, tentativa.fin)}%`,
            }}
            title={`Tu selección: ${tentativa.inicio}–${tentativa.fin}`}
          />
        )}
      </div>

      {mostrarHoras && (
        <div className={`mt-1 flex justify-between font-mono text-[0.6875rem] tabular ${s.horas}`}>
          {marcas.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      )}
    </div>
  )
}

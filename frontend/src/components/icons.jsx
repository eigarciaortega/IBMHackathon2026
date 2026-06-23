/**
 * Iconos SVG de línea (sin emojis). Uso: <Icon name="home" />.
 * Trazo monocromático que hereda `currentColor`.
 */
const PATHS = {
  home: <><path d="M3 10.5 12 4l9 6.5" /><path d="M5 9.5V20h14V9.5" /></>,
  send: <><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>,
  down: <><path d="M7 7 17 17" /><path d="M17 8v9H8" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  activity: <><path d="M3 12h4l3 8 4-16 3 8h4" /></>,
  bell: <><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  shield: <><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></>,
  logout: <><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h9" /></>,
  check: <><path d="m5 12 4.5 4.5L19 7" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  download: <><path d="M12 4v11m0 0 4-4m-4 4-4-4" /><path d="M5 20h14" /></>,
  arrowRight: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
}

export default function Icon({ name, size, className = '' }) {
  const sz = size === 'sm' ? 'ic sm' : size === 'lg' ? 'ic lg' : 'ic'
  return (
    <svg className={`${sz} ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name] || null}
    </svg>
  )
}

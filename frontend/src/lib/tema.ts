// Preferencia de tema (claro/oscuro). Se guarda en localStorage porque es una
// preferencia de interfaz que debe persistir entre sesiones (a diferencia del
// token de sesión, que vive en sessionStorage). La aplicación del tema (clase en
// <html>) la inicia un script en index.html para evitar el parpadeo (FOUC).
export type Tema = 'claro' | 'oscuro'

const CLAVE = 'officespace_tema'

export function temaInicial(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado === 'claro' || guardado === 'oscuro') return guardado
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'oscuro'
  } catch {
    // Sin acceso a localStorage/matchMedia: tema claro por defecto.
  }
  return 'claro'
}

export function aplicarTema(tema: Tema) {
  document.documentElement.classList.toggle('dark', tema === 'oscuro')
  try {
    localStorage.setItem(CLAVE, tema)
  } catch {
    // Silencioso: la preferencia simplemente no persistirá.
  }
}

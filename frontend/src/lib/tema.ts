// Preferencia de tema (claro/oscuro). Se guarda en localStorage porque es una
// preferencia de interfaz que debe persistir entre sesiones (a diferencia del
// token de sesión, que vive en sessionStorage). La aplicación del tema (clase en
// <html>) la inicia un script en index.html para evitar el parpadeo (FOUC).
export type Tema = 'claro' | 'oscuro'

const CLAVE = 'officespace_tema'

export function temaInicial(): Tema {
  try {
    // Solo respeta una elección explícita previa; el tema claro es el predeterminado.
    if (localStorage.getItem(CLAVE) === 'oscuro') return 'oscuro'
  } catch {
    // Sin acceso a localStorage: tema claro por defecto.
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

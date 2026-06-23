// Almacén de notificaciones (toasts) tipo pub-sub, sin dependencias. El
// componente <Toaster> se suscribe con useSyncExternalStore.

export type TipoToast = 'exito' | 'error' | 'info'

export interface Toast {
  id: number
  tipo: TipoToast
  mensaje: string
}

let items: Toast[] = []
const oyentes = new Set<() => void>()

function emitir() {
  for (const fn of oyentes) fn()
}

function agregar(tipo: TipoToast, mensaje: string) {
  const item: Toast = { id: Date.now() + Math.random(), tipo, mensaje }
  items = [...items, item]
  emitir()
  setTimeout(() => descartar(item.id), 4500)
}

export function descartar(id: number) {
  items = items.filter((t) => t.id !== id)
  emitir()
}

export const toast = {
  exito: (mensaje: string) => agregar('exito', mensaje),
  error: (mensaje: string) => agregar('error', mensaje),
  info: (mensaje: string) => agregar('info', mensaje),
}

export function suscribir(fn: () => void): () => void {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

export function instantanea(): Toast[] {
  return items
}

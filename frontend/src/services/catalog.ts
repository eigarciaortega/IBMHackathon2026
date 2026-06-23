import { peticion, URLS } from '../lib/api'
import type { Espacio, EspacioInput, Recurso, RecursoInput, TipoEspacio } from '../types'

export interface FiltrosEspacio {
  tipo?: TipoEspacio | ''
  capacidadMin?: number
}

export const catalogApi = {
  listar(filtros: FiltrosEspacio = {}) {
    const params = new URLSearchParams()
    if (filtros.tipo) params.set('tipo', filtros.tipo)
    if (filtros.capacidadMin && filtros.capacidadMin > 0) {
      params.set('capacidad_min', String(filtros.capacidadMin))
    }
    const qs = params.toString()
    return peticion<Espacio[]>(URLS.catalog, `/spaces${qs ? `?${qs}` : ''}`)
  },
  obtener(id: number) {
    return peticion<Espacio>(URLS.catalog, `/spaces/${id}`)
  },
  crear(input: EspacioInput) {
    return peticion<Espacio>(URLS.catalog, '/spaces', { method: 'POST', body: input })
  },
  actualizar(id: number, input: EspacioInput) {
    return peticion<Espacio>(URLS.catalog, `/spaces/${id}`, { method: 'PUT', body: input })
  },
  eliminar(id: number) {
    return peticion<void>(URLS.catalog, `/spaces/${id}`, { method: 'DELETE' })
  },
}

// Catálogo de recursos (proyector, aire, pizarrón...). Escritura solo ADMIN.
export const recursosApi = {
  listar() {
    return peticion<Recurso[]>(URLS.catalog, '/resources')
  },
  crear(input: RecursoInput) {
    return peticion<Recurso>(URLS.catalog, '/resources', { method: 'POST', body: input })
  },
  actualizar(id: number, input: RecursoInput) {
    return peticion<Recurso>(URLS.catalog, `/resources/${id}`, { method: 'PUT', body: input })
  },
  eliminar(id: number) {
    return peticion<void>(URLS.catalog, `/resources/${id}`, { method: 'DELETE' })
  },
}

// Cliente del catalog-service.
//
// Envuelve los endpoints de gestión de Espacios y el Tablero_Ocupacion sobre el
// cliente HTTP centralizado. Lo consume la Vista de administración (tarea 9.5).

import { request } from './httpClient';
import { SERVICE_URLS } from './config';

/** Lista todos los Espacios con sus atributos (R3.4). */
export function listEspacios() {
  return request(SERVICE_URLS.catalog, '/espacios');
}

/** Crea un Espacio (ADMINISTRADOR) (R3.1). */
export function createEspacio(espacio) {
  return request(SERVICE_URLS.catalog, '/espacios', { method: 'POST', body: espacio });
}

/** Actualiza un Espacio existente (ADMINISTRADOR) (R3.5). */
export function updateEspacio(id, espacio) {
  return request(SERVICE_URLS.catalog, `/espacios/${id}`, { method: 'PUT', body: espacio });
}

/** Elimina un Espacio existente (ADMINISTRADOR) (R3.6). */
export function deleteEspacio(id) {
  return request(SERVICE_URLS.catalog, `/espacios/${id}`, { method: 'DELETE' });
}

/** Obtiene el Tablero_Ocupacion de la fecha actual (R4.1). */
export function getOcupacion() {
  return request(SERVICE_URLS.catalog, '/ocupacion');
}

/** Lista el catálogo de Recursos (id + nombre) para checklists y filtros. */
export function listRecursos() {
  return request(SERVICE_URLS.catalog, '/recursos');
}

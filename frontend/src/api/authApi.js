// Cliente del auth-service.
//
// Envuelve los endpoints de autenticación sobre el cliente HTTP centralizado.
// Las pantallas (tarea 9.2) consumen estas funciones sin conocer detalles de
// transporte ni de normalización de errores.

import { request } from './httpClient';
import { SERVICE_URLS } from './config';

/**
 * Inicia sesión con usuario y contraseña.
 * @param {{ usuario: string, password: string }} credentials
 * @returns {Promise<{ token: string, role: string, expiresIn: number }>}
 */
export function login(credentials) {
  return request(SERVICE_URLS.auth, '/auth/login', {
    method: 'POST',
    body: credentials,
  });
}

/**
 * Verifica el token actual y devuelve los claims básicos.
 * @returns {Promise<{ sub: string, role: string }>}
 */
export function verify() {
  return request(SERVICE_URLS.auth, '/auth/verify');
}

// Almacenamiento de sesión del lado cliente.
//
// Persiste el Token_JWT y el Rol del Usuario en localStorage para que el cliente
// HTTP pueda adjuntar `Authorization: Bearer <token>` y el enrutado pueda decidir
// la vista según el Rol (R2.1, R8.4, R8.5). Toda la lógica de acceso a
// almacenamiento queda encapsulada aquí para mantener un único punto de verdad.

const TOKEN_KEY = 'officespace.token';
const ROLE_KEY = 'officespace.role';
const NOMBRE_KEY = 'officespace.nombre';

/** Roles válidos del sistema. */
export const ROLES = Object.freeze({
  ADMINISTRADOR: 'ADMINISTRADOR',
  COLABORADOR: 'COLABORADOR',
});

/**
 * Acceso defensivo a localStorage (puede no existir en algunos entornos de test).
 * @returns {Storage|null}
 */
function safeStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // localStorage inaccesible (modo privado, SSR, etc.).
  }
  return null;
}

/**
 * Persiste la sesión tras un login exitoso.
 * @param {{ token: string, role: string, nombre?: string }} session
 */
export function setSession({ token, role, nombre }) {
  const storage = safeStorage();
  if (!storage) return;
  if (token) storage.setItem(TOKEN_KEY, token);
  if (role) storage.setItem(ROLE_KEY, role);
  if (nombre) storage.setItem(NOMBRE_KEY, nombre);
}

/** Elimina la sesión almacenada (logout o expiración por 401). */
export function clearSession() {
  const storage = safeStorage();
  if (!storage) return;
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(ROLE_KEY);
  storage.removeItem(NOMBRE_KEY);
}

/** @returns {string|null} El Token_JWT almacenado o null. */
export function getToken() {
  const storage = safeStorage();
  return storage ? storage.getItem(TOKEN_KEY) : null;
}

/** @returns {string|null} El Rol almacenado o null. */
export function getRole() {
  const storage = safeStorage();
  return storage ? storage.getItem(ROLE_KEY) : null;
}

/** @returns {string|null} El nombre del Usuario almacenado o null. */
export function getNombre() {
  const storage = safeStorage();
  return storage ? storage.getItem(NOMBRE_KEY) : null;
}

/** @returns {boolean} true si hay un token presente. */
export function isAuthenticated() {
  return Boolean(getToken());
}

/**
 * Ruta de inicio según el Rol del Usuario (R8.4, R8.5).
 * @param {string|null} role
 * @returns {string}
 */
export function homePathForRole(role) {
  if (role === ROLES.ADMINISTRADOR) return '/admin';
  if (role === ROLES.COLABORADOR) return '/buscar';
  return '/login';
}

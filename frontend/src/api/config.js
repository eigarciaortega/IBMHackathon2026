// Configuración de las URLs base de los microservicios backend.
//
// Las URLs se leen de variables de entorno inyectadas por Vite en build/dev
// (definidas en docker-compose: VITE_AUTH_URL, VITE_CATALOG_URL, VITE_BOOKING_URL).
// Si no están presentes (p. ej. desarrollo local sin docker), se usan valores
// por defecto que apuntan a los puertos publicados de cada servicio.

/**
 * Lee una variable de entorno de Vite con un valor por defecto.
 * Es defensivo frente a entornos (tests con Node) donde `import.meta.env`
 * podría no estar definido.
 *
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
function readEnv(key, fallback) {
  try {
    const env = import.meta.env;
    if (env && typeof env[key] === 'string' && env[key].length > 0) {
      return env[key];
    }
  } catch {
    // import.meta no disponible: usar el valor por defecto.
  }
  return fallback;
}

/** URLs base de cada microservicio, alineadas con los puertos de docker-compose. */
export const SERVICE_URLS = Object.freeze({
  auth: readEnv('VITE_AUTH_URL', 'http://localhost:3001'),
  catalog: readEnv('VITE_CATALOG_URL', 'http://localhost:3002'),
  booking: readEnv('VITE_BOOKING_URL', 'http://localhost:3003'),
});

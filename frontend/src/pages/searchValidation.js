// Validación de cliente del Panel de búsqueda (R9.1, R9.2, R9.3).
//
// Lógica pura y sin dependencias del DOM ni del cliente HTTP, de modo que el
// Panel de búsqueda pueda reutilizarla y la prueba de propiedad (Property 21,
// tarea 9.7) pueda ejercitarla con muchos valores generados.
//
// Reglas (R9.2/R9.3):
//   - fecha: obligatoria e igual o posterior a la fecha actual.
//   - horaInicio/horaFin: obligatorias; horaFin estrictamente posterior a horaInicio.
//   - capacidadMin: filtro opcional; cuando se especifica debe ser un entero
//     entre 1 y 999 (límites incluidos).
//   - tipo: filtro opcional; cuando se especifica debe ser un Tipo_Espacio válido.

/** Valores válidos de Tipo_Espacio (glosario de requisitos). */
export const TIPOS_ESPACIO = Object.freeze(['Sala de juntas', 'Escritorio individual']);

/** Rango permitido para el filtro de Capacidad mínima (R9.1). */
export const CAPACIDAD_MIN = 1;
export const CAPACIDAD_MAX = 999;

/**
 * Formatea una fecha como cadena `YYYY-MM-DD` en hora local, alineada con el
 * formato que produce un `<input type="date">`.
 * @param {Date} date
 * @returns {string}
 */
export function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Valida los valores del formulario de búsqueda sin ejecutar la consulta.
 *
 * @param {object} values
 * @param {string} [values.fecha] - Fecha `YYYY-MM-DD`.
 * @param {string} [values.horaInicio] - Hora `HH:MM`.
 * @param {string} [values.horaFin] - Hora `HH:MM`.
 * @param {string} [values.tipo] - Tipo_Espacio (opcional).
 * @param {string|number} [values.capacidadMin] - Capacidad mínima (opcional).
 * @param {Date} [now] - Instante de referencia (inyectable para pruebas).
 * @returns {{ valid: boolean, errors: Record<string,string>, fields: string[] }}
 */
export function validateSearch(values = {}, now = new Date()) {
  const errors = {};
  const { fecha, horaInicio, horaFin, tipo, capacidadMin } = values;

  // Campos obligatorios (R5.6 a nivel de cliente).
  if (!fecha) errors.fecha = 'La fecha es obligatoria';
  if (!horaInicio) errors.horaInicio = 'La hora de inicio es obligatoria';
  if (!horaFin) errors.horaFin = 'La hora de fin es obligatoria';

  // Fecha igual o posterior a hoy (R9.3). Comparación lexicográfica válida para
  // el formato ISO `YYYY-MM-DD` con relleno de ceros.
  if (fecha && !errors.fecha) {
    const hoy = formatDateInput(now);
    if (fecha < hoy) {
      errors.fecha = 'La fecha no puede ser anterior a hoy';
    }
  }

  // Hora de fin estrictamente posterior a la de inicio (R9.3).
  if (horaInicio && horaFin && !errors.horaInicio && !errors.horaFin) {
    if (horaFin <= horaInicio) {
      errors.horaFin = 'La hora de fin debe ser posterior a la hora de inicio';
    }
  }

  // Capacidad mínima: filtro opcional, pero si se indica debe ser entero 1..999.
  if (capacidadMin !== '' && capacidadMin != null) {
    const n = typeof capacidadMin === 'number' ? capacidadMin : Number(capacidadMin);
    if (!Number.isInteger(n) || n < CAPACIDAD_MIN || n > CAPACIDAD_MAX) {
      errors.capacidadMin = `La capacidad mínima debe ser un entero entre ${CAPACIDAD_MIN} y ${CAPACIDAD_MAX}`;
    }
  }

  // Tipo: filtro opcional, pero si se indica debe ser un Tipo_Espacio válido.
  if (tipo) {
    if (!TIPOS_ESPACIO.includes(tipo)) {
      errors.tipo = 'Tipo de espacio no válido';
    }
  }

  const fields = Object.keys(errors);
  return { valid: fields.length === 0, errors, fields };
}

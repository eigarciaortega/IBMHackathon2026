// Pantalla de Confirmación de reserva (tarea 9.4, R10.1-R10.5).
//
// Muestra un resumen de la Reserva a partir del Espacio seleccionado y los
// criterios de búsqueda recibidos por el estado de navegación del router
// (`location.state`), un campo para el número de Asistentes (entero 1..Capacidad)
// y un botón "Confirmar Reserva".
//
//   - R10.1: resumen + campo de Asistentes + botón "Confirmar Reserva".
//   - R10.2: el campo de Asistentes acepta únicamente enteros entre 1 y Capacidad.
//   - R10.3: confirmación inválida (vacío/no entero/<1/>Capacidad) → mensaje con el
//            rango válido, conservando los datos introducidos.
//   - R10.4: creación exitosa → mensaje de éxito + opción "Ver Mis Reservas".
//   - R10.5: rechazo del Servicio_Reservas → mensaje con el motivo, conservando datos.
//
// El estado de navegación esperado (lo provee el Panel de búsqueda, tarea 9.3):
//   { espacio: { id_espacio, nombre, tipo, capacidad, piso, ubicacion },
//     criterios: { fecha: 'YYYY-MM-DD', horaInicio: 'HH:MM', horaFin: 'HH:MM' } }

import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { crearReserva } from '../api/bookingApi';
import './ConfirmReservationPage.css';

/**
 * Valida el número de Asistentes contra la Capacidad del Espacio (R10.2, R10.3).
 *
 * Se exporta de forma independiente para que la prueba de propiedad de la
 * tarea 9.7 (Property 21) pueda ejercitar esta lógica de validación de cliente
 * sin renderizar el componente.
 *
 * Reglas: el valor debe ser un entero (cadena de solo dígitos o número entero)
 * comprendido entre 1 y `capacidad` inclusive. Cualquier otro valor (vacío, no
 * entero, menor que 1 o mayor que la Capacidad) es inválido.
 *
 * @param {string|number|null|undefined} valor - Valor introducido por el Usuario.
 * @param {number} capacidad - Capacidad del Espacio seleccionado.
 * @returns {{ valido: boolean, valor?: number, error?: string }}
 */
export function validarAsistentes(valor, capacidad) {
  const cap = Number(capacidad);
  const capValida = Number.isInteger(cap) && cap >= 1;
  const rango = capValida ? `entre 1 y ${cap}` : 'mayor o igual a 1';
  const mensajeError = `El número de Asistentes debe ser un entero ${rango}.`;

  if (valor === null || valor === undefined) {
    return { valido: false, error: mensajeError };
  }

  const str = String(valor).trim();
  if (str === '') {
    return { valido: false, error: mensajeError };
  }
  // Solo dígitos: descarta no enteros ("1.5", "abc"), signos y notación científica.
  if (!/^\d+$/.test(str)) {
    return { valido: false, error: mensajeError };
  }

  const n = parseInt(str, 10);
  if (n < 1) {
    return { valido: false, error: mensajeError };
  }
  if (capValida && n > cap) {
    return { valido: false, error: mensajeError };
  }

  return { valido: true, valor: n };
}

/**
 * Combina una fecha (`YYYY-MM-DD`) y una hora (`HH:MM` o `HH:MM:SS`) en una
 * cadena datetime ISO 8601 interpretada en UTC (sufijo `Z`), consistente con la
 * interpretación temporal del booking-service.
 *
 * @param {string} fecha
 * @param {string} hora
 * @returns {string|undefined}
 */
function combinarFechaHoraUTC(fecha, hora) {
  if (!fecha || !hora) return undefined;
  const h = String(hora).trim();
  const horaNorm = /^\d{1,2}:\d{2}$/.test(h) ? `${h}:00` : h;
  return `${String(fecha).trim()}T${horaNorm}Z`;
}

export default function ConfirmReservationPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const espacio = state.espacio || state.space || null;
  const criterios = state.criterios || state.criteria || {};

  const capacidad = espacio ? Number(espacio.capacidad ?? espacio.capacity) : NaN;

  const [asistentes, setAsistentes] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);

  // Sin Espacio seleccionado (acceso directo a la ruta): guiar de vuelta a la búsqueda.
  if (!espacio) {
    return (
      <main className="page page--confirm">
        <h1>Confirmar reserva</h1>
        <p className="confirm__aviso" role="alert">
          No hay un Espacio seleccionado. Vuelva al panel de búsqueda para elegir uno.
        </p>
        <Link to="/buscar">Ir a buscar disponibilidad</Link>
      </main>
    );
  }

  // Vista de éxito (R10.4): mensaje de éxito + opción "Ver Mis Reservas".
  if (exito) {
    return (
      <main className="page page--confirm">
        <h1>Confirmar reserva</h1>
        <p className="confirm__exito" role="status">
          Reserva confirmada correctamente.
        </p>
        <Link className="confirm__ver-reservas" to="/mis-reservas">
          Ver Mis Reservas
        </Link>
      </main>
    );
  }

  const nombre = espacio.nombre ?? espacio.identificador ?? espacio.id_espacio ?? espacio.id;
  const tipo = espacio.tipo ?? espacio.tipo_espacio;

  async function handleSubmit(evento) {
    evento.preventDefault();
    setError('');

    // R10.3 — Validación del campo de Asistentes; conservar datos ante error.
    const veredicto = validarAsistentes(asistentes, capacidad);
    if (!veredicto.valido) {
      setError(veredicto.error);
      return;
    }

    setEnviando(true);
    try {
      await crearReserva({
        idEspacio: espacio.id_espacio ?? espacio.id,
        fechaInicio: combinarFechaHoraUTC(criterios.fecha, criterios.horaInicio),
        fechaFin: combinarFechaHoraUTC(criterios.fecha, criterios.horaFin),
        asistentes: veredicto.valor,
      });
      setExito(true);
    } catch (err) {
      // R10.5 — Mostrar el motivo del rechazo y conservar los datos introducidos.
      setError(err && err.message ? err.message : 'No se pudo crear la Reserva.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="page page--confirm">
      <h1>Confirmar reserva</h1>

      <section className="confirm__resumen" aria-label="Resumen de la Reserva">
        <h2>Resumen</h2>
        <dl className="confirm__detalles">
          <div>
            <dt>Espacio</dt>
            <dd>{nombre}</dd>
          </div>
          {tipo != null && (
            <div>
              <dt>Tipo</dt>
              <dd>{tipo}</dd>
            </div>
          )}
          {Number.isInteger(capacidad) && (
            <div>
              <dt>Capacidad</dt>
              <dd>{capacidad}</dd>
            </div>
          )}
          {espacio.piso != null && (
            <div>
              <dt>Piso</dt>
              <dd>{espacio.piso}</dd>
            </div>
          )}
          {espacio.ubicacion != null && (
            <div>
              <dt>Ubicación</dt>
              <dd>{espacio.ubicacion}</dd>
            </div>
          )}
          {criterios.fecha && (
            <div>
              <dt>Fecha</dt>
              <dd>{criterios.fecha}</dd>
            </div>
          )}
          {(criterios.horaInicio || criterios.horaFin) && (
            <div>
              <dt>Horario</dt>
              <dd>
                {criterios.horaInicio} - {criterios.horaFin}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <form className="confirm__form" onSubmit={handleSubmit} noValidate>
        <label className="confirm__label" htmlFor="asistentes">
          Asistentes{Number.isInteger(capacidad) ? ` (1 - ${capacidad})` : ''}
        </label>
        <input
          id="asistentes"
          name="asistentes"
          type="number"
          min={1}
          max={Number.isInteger(capacidad) ? capacidad : undefined}
          step={1}
          inputMode="numeric"
          value={asistentes}
          onChange={(e) => setAsistentes(e.target.value)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'asistentes-error' : undefined}
          disabled={enviando}
        />

        {error && (
          <p id="asistentes-error" className="confirm__error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="confirm__submit" disabled={enviando}>
          {enviando ? 'Confirmando…' : 'Confirmar Reserva'}
        </button>
      </form>
    </main>
  );
}

// Panel de búsqueda de disponibilidad (tarea 9.3, R9.1-R9.5).
//
// Vista de inicio del Rol COLABORADOR (R8.5). Presenta los campos de fecha,
// hora de inicio, hora de fin, filtro de Tipo_Espacio y Capacidad mínima
// (1..999). La validación de cliente (`validateSearch`) se ejecuta antes de
// llamar a la API: si hay errores, se conservan los valores ingresados y se
// muestran los mensajes correspondientes sin consultar el backend (R9.3).
//
// Los resultados se renderizan como una lista con un botón "Reservar" por cada
// Espacio disponible (R9.5); si la búsqueda válida no devuelve Espacios, se
// muestra un mensaje de "sin resultados" (R9.4). Al pulsar "Reservar" se navega
// a /reservar pasando el Espacio seleccionado y los criterios de la búsqueda
// para que la pantalla de Confirmación (tarea 9.4) complete la Reserva.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buscarDisponibilidad } from '../api/bookingApi';
import { listRecursos } from '../api/catalogApi';
import { validateSearch, TIPOS_ESPACIO } from './searchValidation';
import './SearchPage.css';

const INITIAL_VALUES = Object.freeze({
  fecha: '',
  horaInicio: '',
  horaFin: '',
  tipo: '',
  capacidadMin: '',
});

/** Extrae la lista de Espacios de la respuesta del endpoint `/disponibilidad`. */
function leerEspacios(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.espacios)) return data.espacios;
  return [];
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [resultados, setResultados] = useState(null); // null = sin búsqueda aún.
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Catálogo de Recursos y selección del filtro (ids marcados con palomita).
  const [recursosCatalogo, setRecursosCatalogo] = useState([]);
  const [recursosSeleccionados, setRecursosSeleccionados] = useState([]);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await listRecursos();
        if (activo) {
          setRecursosCatalogo(Array.isArray(data?.recursos) ? data.recursos : []);
        }
      } catch {
        // El filtro de recursos es opcional: si no carga, se omite.
        if (activo) setRecursosCatalogo([]);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  /** Alterna un Recurso del filtro de búsqueda. */
  function alternarRecurso(idRecurso) {
    setRecursosSeleccionados((previo) =>
      previo.includes(idRecurso)
        ? previo.filter((id) => id !== idRecurso)
        : [...previo, idRecurso],
    );
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setApiError(null);

    const { valid, errors: nextErrors } = validateSearch(values);
    setErrors(nextErrors);
    if (!valid) {
      // Búsqueda inválida: conservar valores y no consultar la API (R9.3).
      return;
    }

    const criterios = {
      fecha: values.fecha,
      horaInicio: values.horaInicio,
      horaFin: values.horaFin,
    };
    if (values.tipo) criterios.tipo = values.tipo;
    if (values.capacidadMin !== '') criterios.capacidadMin = Number(values.capacidadMin);
    if (recursosSeleccionados.length > 0) criterios.recursos = [...recursosSeleccionados];

    setLoading(true);
    try {
      const data = await buscarDisponibilidad(criterios);
      setResultados(leerEspacios(data));
    } catch (err) {
      setApiError(err.message || 'No se pudo completar la búsqueda');
      setResultados(null);
    } finally {
      setLoading(false);
    }
  }

  function handleReservar(espacio) {
    navigate('/reservar', {
      state: {
        espacio,
        criterios: {
          fecha: values.fecha,
          horaInicio: values.horaInicio,
          horaFin: values.horaFin,
        },
      },
    });
  }

  const sinResultados = !loading && Array.isArray(resultados) && resultados.length === 0;

  return (
    <main className="page page--search">
      <h1>Buscar disponibilidad</h1>

      <form className="search-form" onSubmit={handleSubmit} noValidate>
        <div className="search-field">
          <label htmlFor="fecha">Fecha</label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            value={values.fecha}
            onChange={handleChange}
            aria-invalid={Boolean(errors.fecha)}
            aria-describedby={errors.fecha ? 'fecha-error' : undefined}
          />
          {errors.fecha && (
            <span id="fecha-error" className="search-field__error" role="alert">
              {errors.fecha}
            </span>
          )}
        </div>

        <div className="search-field">
          <label htmlFor="horaInicio">Hora de inicio</label>
          <input
            id="horaInicio"
            name="horaInicio"
            type="time"
            value={values.horaInicio}
            onChange={handleChange}
            aria-invalid={Boolean(errors.horaInicio)}
            aria-describedby={errors.horaInicio ? 'horaInicio-error' : undefined}
          />
          {errors.horaInicio && (
            <span id="horaInicio-error" className="search-field__error" role="alert">
              {errors.horaInicio}
            </span>
          )}
        </div>

        <div className="search-field">
          <label htmlFor="horaFin">Hora de fin</label>
          <input
            id="horaFin"
            name="horaFin"
            type="time"
            value={values.horaFin}
            onChange={handleChange}
            aria-invalid={Boolean(errors.horaFin)}
            aria-describedby={errors.horaFin ? 'horaFin-error' : undefined}
          />
          {errors.horaFin && (
            <span id="horaFin-error" className="search-field__error" role="alert">
              {errors.horaFin}
            </span>
          )}
        </div>

        <div className="search-field">
          <label htmlFor="tipo">Tipo de espacio</label>
          <select
            id="tipo"
            name="tipo"
            value={values.tipo}
            onChange={handleChange}
            aria-invalid={Boolean(errors.tipo)}
            aria-describedby={errors.tipo ? 'tipo-error' : undefined}
          >
            <option value="">Todos</option>
            {TIPOS_ESPACIO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
          {errors.tipo && (
            <span id="tipo-error" className="search-field__error" role="alert">
              {errors.tipo}
            </span>
          )}
        </div>

        <div className="search-field">
          <label htmlFor="capacidadMin">Capacidad mínima</label>
          <input
            id="capacidadMin"
            name="capacidadMin"
            type="number"
            min="1"
            max="999"
            step="1"
            value={values.capacidadMin}
            onChange={handleChange}
            aria-invalid={Boolean(errors.capacidadMin)}
            aria-describedby={errors.capacidadMin ? 'capacidadMin-error' : undefined}
          />
          {errors.capacidadMin && (
            <span id="capacidadMin-error" className="search-field__error" role="alert">
              {errors.capacidadMin}
            </span>
          )}
        </div>

        <fieldset className="search-field search-field--recursos">
          <legend>Recursos (opcional)</legend>
          {recursosCatalogo.length === 0 ? (
            <span className="search-field__nota">Sin catálogo de recursos.</span>
          ) : (
            <ul className="search-recursos">
              {recursosCatalogo.map((recurso) => (
                <li key={recurso.id_recurso}>
                  <label>
                    <input
                      type="checkbox"
                      checked={recursosSeleccionados.includes(recurso.id_recurso)}
                      onChange={() => alternarRecurso(recurso.id_recurso)}
                    />
                    {recurso.nombre}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <div className="search-actions">
          <button type="submit" className="search-submit" disabled={loading}>
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
      </form>

      {apiError && (
        <p className="search-feedback search-feedback--error" role="alert">
          {apiError}
        </p>
      )}

      {sinResultados && (
        <p className="search-feedback search-feedback--empty" role="status">
          No se encontraron espacios disponibles para los criterios indicados.
        </p>
      )}

      {Array.isArray(resultados) && resultados.length > 0 && (
        <ul className="search-results">
          {resultados.map((espacio) => (
            <li key={espacio.id_espacio} className="result-card">
              <div className="result-card__info">
                <h2>{espacio.nombre}</h2>
                <p className="result-card__meta">
                  {espacio.tipo} · Capacidad {espacio.capacidad} · Piso {espacio.piso} ·{' '}
                  {espacio.ubicacion}
                </p>
              </div>
              <button
                type="button"
                className="result-card__reservar"
                onClick={() => handleReservar(espacio)}
              >
                Reservar
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

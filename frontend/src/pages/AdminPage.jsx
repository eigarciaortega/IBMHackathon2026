// Vista de administración (tarea 9.5 + mejoras).
//
// Vista de inicio del Rol ADMINISTRADOR. Compone:
//   - El Tablero_Ocupacion de la fecha actual (R11.1).
//   - Una tabla de Espacios con crear/editar/eliminar (R11.2).
//   - Un formulario con campos obligatorios y un CHECKLIST de Recursos opcional,
//     poblado desde el catálogo (GET /recursos).
//   - Validación conservando datos (R11.5) y confirmación de borrado (R11.6).
//   - Una tabla con TODAS las Reservas del corporativo (GET /reservas).

import { useCallback, useEffect, useState } from 'react';
import {
  listEspacios,
  getOcupacion,
  listRecursos,
  createEspacio,
  updateEspacio,
  deleteEspacio,
} from '../api/catalogApi';
import { todasLasReservas, cancelarReserva } from '../api/bookingApi';
import { presentarAsistencia } from '../lib/asistencia';
import './AdminPage.css';

/** Valores válidos de Tipo_Espacio (R3.3). */
const TIPOS_ESPACIO = ['Sala de juntas', 'Escritorio individual'];

/** Estado inicial del formulario de Espacio. `recursos` es un array de ids. */
const FORM_VACIO = Object.freeze({
  nombre: '',
  tipo: '',
  capacidad: '',
  piso: '',
  ubicacion: '',
  recursos: [],
});

/** Valida los campos obligatorios e inválidos del formulario (R11.5, R3.2, R3.3). */
function validarFormulario(form) {
  const errores = {};

  const nombre = form.nombre.trim();
  if (nombre.length < 1 || nombre.length > 100) {
    errores.nombre = 'El nombre/identificador es obligatorio (1 a 100 caracteres).';
  }

  if (!TIPOS_ESPACIO.includes(form.tipo)) {
    errores.tipo = 'Seleccione un Tipo_Espacio válido.';
  }

  const capacidadTexto = String(form.capacidad).trim();
  const capacidad = Number(capacidadTexto);
  if (capacidadTexto === '' || !Number.isInteger(capacidad) || capacidad < 1 || capacidad > 1000) {
    errores.capacidad = 'La Capacidad debe ser un entero entre 1 y 1000.';
  }

  const pisoTexto = String(form.piso).trim();
  const piso = Number(pisoTexto);
  if (pisoTexto === '' || !Number.isInteger(piso)) {
    errores.piso = 'El Piso es obligatorio y debe ser un número entero.';
  }

  if (form.ubicacion.trim().length < 1) {
    errores.ubicacion = 'La Ubicacion es obligatoria.';
  }

  return errores;
}

/** Construye el payload de Espacio a enviar al backend a partir del formulario. */
function construirPayload(form) {
  return {
    nombre: form.nombre.trim(),
    tipo: form.tipo,
    capacidad: Number(String(form.capacidad).trim()),
    piso: Number(String(form.piso).trim()),
    ubicacion: form.ubicacion.trim(),
    recursos: Array.isArray(form.recursos) ? form.recursos : [],
  };
}

/** Representa los Recursos asociados de un Espacio como texto legible. */
function recursosATexto(recursos) {
  if (!Array.isArray(recursos) || recursos.length === 0) {
    return '—';
  }
  return recursos.map((r) => r.nombre).join(', ');
}

/** Extrae los ids de Recurso asociados de un Espacio (para precargar el checklist). */
function recursosAIds(recursos) {
  if (!Array.isArray(recursos)) return [];
  return recursos.map((r) => Number(r.id_recurso)).filter((n) => Number.isInteger(n));
}

/** Formato de un datetime mostrando la misma hora-pared registrada (UTC). */
function formatFecha(valor) {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

export default function AdminPage() {
  const [espacios, setEspacios] = useState([]);
  const [ocupacion, setOcupacion] = useState([]);
  const [catalogoRecursos, setCatalogoRecursos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  const [feedback, setFeedback] = useState(null); // { tipo: 'exito'|'error', texto }

  const [formVisible, setFormVisible] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [erroresForm, setErroresForm] = useState({});
  const [enviando, setEnviando] = useState(false);

  const [espacioAEliminar, setEspacioAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  // Borrado de Reservas (supervisión del administrador).
  const [reservaAEliminar, setReservaAEliminar] = useState(null);
  const [eliminandoReserva, setEliminandoReserva] = useState(false);
  const [eliminarTodas, setEliminarTodas] = useState(false);

  /** Recarga Espacios, Tablero_Ocupacion y catálogo de Recursos. */
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const [dataEspacios, dataOcupacion, dataRecursos] = await Promise.all([
        listEspacios(),
        getOcupacion(),
        listRecursos(),
      ]);
      setEspacios(Array.isArray(dataEspacios?.espacios) ? dataEspacios.espacios : []);
      setOcupacion(Array.isArray(dataOcupacion) ? dataOcupacion : []);
      setCatalogoRecursos(Array.isArray(dataRecursos?.recursos) ? dataRecursos.recursos : []);
    } catch (err) {
      setErrorCarga(err?.message || 'No se pudieron cargar los datos de administración.');
    } finally {
      setCargando(false);
    }
  }, []);

  /** Carga (de forma aislada) todas las Reservas del corporativo. */
  const cargarReservas = useCallback(async () => {
    try {
      const data = await todasLasReservas();
      setReservas(Array.isArray(data?.reservas) ? data.reservas : []);
    } catch {
      // No bloquea la vista si el listado de reservas falla.
      setReservas([]);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
    cargarReservas();
  }, [cargarDatos, cargarReservas]);

  function abrirCreacion() {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setErroresForm({});
    setFeedback(null);
    setFormVisible(true);
  }

  function abrirEdicion(espacio) {
    setEditandoId(espacio.id_espacio);
    setForm({
      nombre: espacio.nombre ?? '',
      tipo: espacio.tipo ?? '',
      capacidad: espacio.capacidad != null ? String(espacio.capacidad) : '',
      piso: espacio.piso != null ? String(espacio.piso) : '',
      ubicacion: espacio.ubicacion ?? '',
      recursos: recursosAIds(espacio.recursos),
    });
    setErroresForm({});
    setFeedback(null);
    setFormVisible(true);
  }

  function cerrarFormulario() {
    setFormVisible(false);
    setEditandoId(null);
    setForm(FORM_VACIO);
    setErroresForm({});
  }

  function actualizarCampo(campo, valor) {
    setForm((previo) => ({ ...previo, [campo]: valor }));
  }

  /** Alterna la selección de un Recurso en el checklist. */
  function alternarRecurso(idRecurso) {
    setForm((previo) => {
      const actuales = Array.isArray(previo.recursos) ? previo.recursos : [];
      const existe = actuales.includes(idRecurso);
      return {
        ...previo,
        recursos: existe
          ? actuales.filter((id) => id !== idRecurso)
          : [...actuales, idRecurso],
      };
    });
  }

  async function enviarFormulario(evento) {
    evento.preventDefault();
    setFeedback(null);

    const errores = validarFormulario(form);
    if (Object.keys(errores).length > 0) {
      setErroresForm(errores);
      return;
    }
    setErroresForm({});

    const payload = construirPayload(form);
    const esEdicion = editandoId != null;

    setEnviando(true);
    try {
      if (esEdicion) {
        await updateEspacio(editandoId, payload);
      } else {
        await createEspacio(payload);
      }
      await cargarDatos();
      await cargarReservas();
      setFormVisible(false);
      setEditandoId(null);
      setForm(FORM_VACIO);
      setFeedback({
        tipo: 'exito',
        texto: esEdicion ? 'Espacio actualizado correctamente.' : 'Espacio creado correctamente.',
      });
    } catch (err) {
      if (Array.isArray(err?.fields) && err.fields.length > 0) {
        const erroresApi = {};
        for (const campo of err.fields) {
          erroresApi[campo] = err.message || 'Campo inválido.';
        }
        setErroresForm(erroresApi);
      }
      setFeedback({ tipo: 'error', texto: err?.message || 'No se pudo guardar el Espacio.' });
    } finally {
      setEnviando(false);
    }
  }

  function solicitarEliminacion(espacio) {
    setFeedback(null);
    setEspacioAEliminar(espacio);
  }

  function cancelarEliminacion() {
    setEspacioAEliminar(null);
  }

  async function confirmarEliminacion() {
    if (!espacioAEliminar) return;
    setEliminando(true);
    try {
      await deleteEspacio(espacioAEliminar.id_espacio);
      await cargarDatos();
      await cargarReservas();
      setFeedback({ tipo: 'exito', texto: 'Espacio eliminado correctamente.' });
    } catch (err) {
      setFeedback({ tipo: 'error', texto: err?.message || 'No se pudo eliminar el Espacio.' });
    } finally {
      setEliminando(false);
      setEspacioAEliminar(null);
    }
  }

  /** Solicita confirmación para eliminar una Reserva concreta. */
  function solicitarEliminacionReserva(reserva) {
    setFeedback(null);
    setReservaAEliminar(reserva);
  }

  /** Confirma y elimina la Reserva seleccionada (borrado de administrador). */
  async function confirmarEliminacionReserva() {
    if (!reservaAEliminar) return;
    setEliminandoReserva(true);
    try {
      await cancelarReserva(reservaAEliminar.id_reserva);
      await cargarReservas();
      setFeedback({ tipo: 'exito', texto: 'Reserva eliminada correctamente.' });
    } catch (err) {
      setFeedback({ tipo: 'error', texto: err?.message || 'No se pudo eliminar la reserva.' });
    } finally {
      setEliminandoReserva(false);
      setReservaAEliminar(null);
    }
  }

  /** Confirma y elimina TODAS las Reservas del corporativo. */
  async function confirmarEliminarTodas() {
    setEliminandoReserva(true);
    try {
      for (const r of reservas) {
        // eslint-disable-next-line no-await-in-loop
        await cancelarReserva(r.id_reserva);
      }
      await cargarReservas();
      setFeedback({ tipo: 'exito', texto: 'Se eliminaron todas las reservas.' });
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err?.message || 'No se pudieron eliminar todas las reservas.',
      });
      await cargarReservas();
    } finally {
      setEliminandoReserva(false);
      setEliminarTodas(false);
    }
  }

  return (
    <main className="page page--admin">
      <h1>Administración</h1>

      {feedback && (
        <p
          role={feedback.tipo === 'error' ? 'alert' : 'status'}
          className={`admin-feedback admin-feedback--${feedback.tipo}`}
        >
          {feedback.texto}
        </p>
      )}

      {errorCarga && !cargando && (
        <div className="admin-error" role="alert">
          <p>{errorCarga}</p>
          <button type="button" onClick={cargarDatos}>
            Reintentar
          </button>
        </div>
      )}

      {cargando ? (
        <p role="status">Cargando…</p>
      ) : (
        <>
          {/* --- Tablero de Ocupación (R11.1) --- */}
          <section className="admin-section" aria-labelledby="titulo-ocupacion">
            <h2 id="titulo-ocupacion">Tablero de ocupación (hoy)</h2>
            {ocupacion.length === 0 ? (
              <p>No hay espacios registrados.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Espacio</th>
                    <th scope="col">Piso</th>
                    <th scope="col">Ubicación</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ocupacion.map((item) => (
                    <tr key={item.id_espacio}>
                      <td>{item.nombre}</td>
                      <td>{item.piso}</td>
                      <td>{item.ubicacion}</td>
                      <td>
                        <span className={`estado estado--${item.estado}`}>{item.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* --- Tabla de Espacios con CRUD (R11.2) --- */}
          <section className="admin-section" aria-labelledby="titulo-espacios">
            <div className="admin-section__header">
              <h2 id="titulo-espacios">Espacios</h2>
              <button type="button" onClick={abrirCreacion}>
                Crear espacio
              </button>
            </div>

            {espacios.length === 0 ? (
              <p>No hay espacios registrados.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Capacidad</th>
                    <th scope="col">Recursos</th>
                    <th scope="col">Piso</th>
                    <th scope="col">Ubicación</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {espacios.map((espacio) => (
                    <tr key={espacio.id_espacio}>
                      <td>{espacio.nombre}</td>
                      <td>{espacio.tipo}</td>
                      <td>{espacio.capacidad}</td>
                      <td>{recursosATexto(espacio.recursos)}</td>
                      <td>{espacio.piso}</td>
                      <td>{espacio.ubicacion}</td>
                      <td className="admin-table__actions">
                        <button type="button" onClick={() => abrirEdicion(espacio)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="boton--peligro"
                          onClick={() => solicitarEliminacion(espacio)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* --- Todas las Reservas del corporativo --- */}
          <section className="admin-section" aria-labelledby="titulo-reservas">
            <div className="admin-section__header">
              <h2 id="titulo-reservas">Todas las reservas</h2>
              {reservas.length > 0 && (
                <button
                  type="button"
                  className="boton--peligro"
                  onClick={() => {
                    setFeedback(null);
                    setEliminarTodas(true);
                  }}
                >
                  Eliminar todas
                </button>
              )}
            </div>
            {reservas.length === 0 ? (
              <p>No hay reservas registradas.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Espacio</th>
                    <th scope="col">Usuario</th>
                    <th scope="col">Inicio</th>
                    <th scope="col">Fin</th>
                    <th scope="col">Asistentes</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Asistencia</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.map((r) => (
                    <tr key={r.id_reserva}>
                      <td>{r.espacio_nombre ?? r.id_espacio}</td>
                      <td>{r.usuario_nombre ?? r.usuario_email ?? r.id_usuario}</td>
                      <td>{formatFecha(r.fecha_inicio)}</td>
                      <td>{formatFecha(r.fecha_fin)}</td>
                      <td>{r.cantidad_asistentes}</td>
                      <td>
                        <span className={`estado estado--${r.estado_reserva}`}>
                          {r.estado_reserva}
                        </span>
                      </td>
                      <td>
                        {(() => {
                          const a = presentarAsistencia(r.estado_asistencia);
                          return <span className={a.className}>{a.label}</span>;
                        })()}
                      </td>
                      <td className="admin-table__actions">
                        <button
                          type="button"
                          className="boton--peligro"
                          onClick={() => solicitarEliminacionReserva(r)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      {/* --- Formulario de creación/edición (R11.3, R11.5) --- */}
      {formVisible && (
        <section className="admin-form" aria-labelledby="titulo-form">
          <h2 id="titulo-form">{editandoId != null ? 'Editar espacio' : 'Crear espacio'}</h2>
          <form onSubmit={enviarFormulario} noValidate>
            <div className="campo">
              <label htmlFor="campo-nombre">Nombre/identificador *</label>
              <input
                id="campo-nombre"
                type="text"
                value={form.nombre}
                onChange={(e) => actualizarCampo('nombre', e.target.value)}
                aria-invalid={Boolean(erroresForm.nombre)}
              />
              {erroresForm.nombre && (
                <span className="campo-error" role="alert">
                  {erroresForm.nombre}
                </span>
              )}
            </div>

            <div className="campo">
              <label htmlFor="campo-tipo">Tipo de espacio *</label>
              <select
                id="campo-tipo"
                value={form.tipo}
                onChange={(e) => actualizarCampo('tipo', e.target.value)}
                aria-invalid={Boolean(erroresForm.tipo)}
              >
                <option value="">Seleccione…</option>
                {TIPOS_ESPACIO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
              {erroresForm.tipo && (
                <span className="campo-error" role="alert">
                  {erroresForm.tipo}
                </span>
              )}
            </div>

            <div className="campo">
              <label htmlFor="campo-capacidad">Capacidad *</label>
              <input
                id="campo-capacidad"
                type="number"
                min="1"
                max="1000"
                value={form.capacidad}
                onChange={(e) => actualizarCampo('capacidad', e.target.value)}
                aria-invalid={Boolean(erroresForm.capacidad)}
              />
              {erroresForm.capacidad && (
                <span className="campo-error" role="alert">
                  {erroresForm.capacidad}
                </span>
              )}
            </div>

            <div className="campo">
              <label htmlFor="campo-piso">Piso *</label>
              <input
                id="campo-piso"
                type="number"
                value={form.piso}
                onChange={(e) => actualizarCampo('piso', e.target.value)}
                aria-invalid={Boolean(erroresForm.piso)}
              />
              {erroresForm.piso && (
                <span className="campo-error" role="alert">
                  {erroresForm.piso}
                </span>
              )}
            </div>

            <div className="campo">
              <label htmlFor="campo-ubicacion">Ubicación *</label>
              <input
                id="campo-ubicacion"
                type="text"
                value={form.ubicacion}
                onChange={(e) => actualizarCampo('ubicacion', e.target.value)}
                aria-invalid={Boolean(erroresForm.ubicacion)}
              />
              {erroresForm.ubicacion && (
                <span className="campo-error" role="alert">
                  {erroresForm.ubicacion}
                </span>
              )}
            </div>

            {/* Checklist de Recursos (opcional). */}
            <fieldset className="campo campo--recursos">
              <legend>Recursos (opcional)</legend>
              {catalogoRecursos.length === 0 ? (
                <p className="campo-nota">No hay recursos en el catálogo.</p>
              ) : (
                <ul className="recursos-checklist">
                  {catalogoRecursos.map((recurso) => (
                    <li key={recurso.id_recurso}>
                      <label>
                        <input
                          type="checkbox"
                          checked={form.recursos.includes(recurso.id_recurso)}
                          onChange={() => alternarRecurso(recurso.id_recurso)}
                        />
                        {recurso.nombre}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>

            <div className="admin-form__actions">
              <button type="submit" disabled={enviando}>
                {enviando ? 'Guardando…' : 'Guardar'}
              </button>
              <button type="button" onClick={cerrarFormulario} disabled={enviando}>
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {/* --- Confirmación explícita de borrado (R11.6) --- */}
      {espacioAEliminar && (
        <div
          className="admin-confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-confirm"
        >
          <div className="admin-confirm__panel">
            <h2 id="titulo-confirm">Confirmar eliminación</h2>
            <p>
              ¿Seguro que desea eliminar el espacio “{espacioAEliminar.nombre}”? Esta acción no se
              puede deshacer.
            </p>
            <div className="admin-confirm__actions">
              <button
                type="button"
                className="boton--peligro"
                onClick={confirmarEliminacion}
                disabled={eliminando}
              >
                {eliminando ? 'Eliminando…' : 'Confirmar eliminación'}
              </button>
              <button type="button" onClick={cancelarEliminacion} disabled={eliminando}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Confirmación de borrado de una Reserva --- */}
      {reservaAEliminar && (
        <div className="admin-confirm" role="dialog" aria-modal="true" aria-labelledby="titulo-conf-reserva">
          <div className="admin-confirm__panel">
            <h2 id="titulo-conf-reserva">Eliminar reserva</h2>
            <p>
              ¿Seguro que desea eliminar la reserva de “{reservaAEliminar.espacio_nombre ??
                reservaAEliminar.id_espacio}” del usuario “{reservaAEliminar.usuario_nombre ??
                reservaAEliminar.usuario_email ??
                reservaAEliminar.id_usuario}”? Esta acción no se puede deshacer.
            </p>
            <div className="admin-confirm__actions">
              <button
                type="button"
                className="boton--peligro"
                onClick={confirmarEliminacionReserva}
                disabled={eliminandoReserva}
              >
                {eliminandoReserva ? 'Eliminando…' : 'Confirmar eliminación'}
              </button>
              <button
                type="button"
                onClick={() => setReservaAEliminar(null)}
                disabled={eliminandoReserva}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Confirmación de borrado de TODAS las Reservas --- */}
      {eliminarTodas && (
        <div className="admin-confirm" role="dialog" aria-modal="true" aria-labelledby="titulo-conf-todas">
          <div className="admin-confirm__panel">
            <h2 id="titulo-conf-todas">Eliminar todas las reservas</h2>
            <p>
              ¿Seguro que desea eliminar las {reservas.length} reservas del corporativo? Esta
              acción no se puede deshacer.
            </p>
            <div className="admin-confirm__actions">
              <button
                type="button"
                className="boton--peligro"
                onClick={confirmarEliminarTodas}
                disabled={eliminandoReserva}
              >
                {eliminandoReserva ? 'Eliminando…' : 'Eliminar todas'}
              </button>
              <button
                type="button"
                onClick={() => setEliminarTodas(false)}
                disabled={eliminandoReserva}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

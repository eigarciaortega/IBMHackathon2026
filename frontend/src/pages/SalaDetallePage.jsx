// Detalle de una sala (COLABORADOR / ADMINISTRADOR).
//
// Muestra la información de la sala, sus características (recursos) y las
// reuniones programadas en orden de fecha próxima. Se accede desde la lista de
// Salas; si se entra directo por URL, recupera los datos del backend.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { listEspacios } from '../api/catalogApi';
import { agenda, crearReserva } from '../api/bookingApi';
import { presentarAsistencia } from '../lib/asistencia';
import './SalaDetallePage.css';

/** Formato de un datetime mostrando la hora-pared registrada (UTC). */
function formatFecha(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor ?? '—');
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

export default function SalaDetallePage() {
  const { id } = useParams();
  const location = useLocation();
  const estadoNav = location.state || {};

  const [espacio, setEspacio] = useState(estadoNav.espacio || null);
  const [reuniones, setReuniones] = useState(
    Array.isArray(estadoNav.reuniones) ? estadoNav.reuniones : null,
  );
  const [cargando, setCargando] = useState(!estadoNav.espacio || !estadoNav.reuniones);
  const [error, setError] = useState(null);

  // Alta de reservación desde el detalle de la sala.
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState({ fecha: '', horaInicio: '', horaFin: '', asistentes: '' });
  const [errorForm, setErrorForm] = useState('');
  const [creando, setCreando] = useState(false);
  const [feedback, setFeedback] = useState(null); // { tipo, texto }

  /** Refresca solo la lista de reuniones de esta sala desde la agenda. */
  const recargarReuniones = useCallback(async () => {
    const dataAgenda = await agenda();
    const todas = Array.isArray(dataAgenda?.reservas) ? dataAgenda.reservas : [];
    setReuniones(todas.filter((r) => String(r.id_espacio) === String(id)));
  }, [id]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const tareas = [agenda()];
      if (!espacio) tareas.push(listEspacios());
      const [dataAgenda, dataEspacios] = await Promise.all(tareas);

      if (!espacio && dataEspacios) {
        const lista = Array.isArray(dataEspacios.espacios) ? dataEspacios.espacios : [];
        const encontrado = lista.find((e) => String(e.id_espacio) === String(id));
        setEspacio(encontrado || null);
      }
      const todas = Array.isArray(dataAgenda?.reservas) ? dataAgenda.reservas : [];
      setReuniones(todas.filter((r) => String(r.id_espacio) === String(id)));
    } catch (err) {
      setError(err?.message || 'No se pudo cargar el detalle de la sala.');
    } finally {
      setCargando(false);
    }
  }, [espacio, id]);

  useEffect(() => {
    // Si falta información (entrada directa por URL) o no hay reuniones aún, cargar.
    if (!estadoNav.espacio || !Array.isArray(estadoNav.reuniones)) {
      cargar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reuniones futuras/vigentes ordenadas por fecha próxima.
  const reunionesProximas = useMemo(() => {
    const lista = Array.isArray(reuniones) ? reuniones : [];
    const ahora = Date.now();
    return lista
      .filter((r) => {
        const fin = new Date(r.fecha_fin).getTime();
        return Number.isNaN(fin) ? true : fin >= ahora;
      })
      .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
  }, [reuniones]);

  function actualizarCampo(campo, valor) {
    setForm((previo) => ({ ...previo, [campo]: valor }));
  }

  /**
   * Crea una reservación para esta sala. El backend verifica el solapamiento y
   * rechaza con 409 si choca con una reunión existente; ese motivo se muestra y
   * se conservan los datos del formulario.
   */
  async function agregarReservacion(evento) {
    evento.preventDefault();
    setErrorForm('');
    setFeedback(null);

    if (!form.fecha || !form.horaInicio || !form.horaFin) {
      setErrorForm('Completa fecha, hora de inicio y hora de fin.');
      return;
    }
    if (form.horaFin <= form.horaInicio) {
      setErrorForm('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    const asistentes = Number(form.asistentes);
    const cap = Number(espacio?.capacidad);
    if (!Number.isInteger(asistentes) || asistentes < 1) {
      setErrorForm('Los asistentes deben ser un entero mayor o igual a 1.');
      return;
    }
    if (Number.isInteger(cap) && asistentes > cap) {
      setErrorForm(`Los asistentes no pueden superar la capacidad (${cap}).`);
      return;
    }

    setCreando(true);
    try {
      await crearReserva({
        idEspacio: espacio.id_espacio,
        fechaInicio: `${form.fecha}T${form.horaInicio}:00Z`,
        fechaFin: `${form.fecha}T${form.horaFin}:00Z`,
        asistentes,
      });
      await recargarReuniones();
      setForm({ fecha: '', horaInicio: '', horaFin: '', asistentes: '' });
      setFormVisible(false);
      setFeedback({ tipo: 'exito', texto: 'Reservación creada correctamente.' });
    } catch (err) {
      // 409 = solapa con otra reunión; se conserva el formulario.
      setErrorForm(err?.message || 'No se pudo crear la reservación.');
    } finally {
      setCreando(false);
    }
  }

  return (
    <main className="page page--sala-detalle">
      <p className="sala-detalle__volver">
        <Link to="/salas">← Volver a salas</Link>
      </p>

      {cargando ? (
        <p role="status">Cargando…</p>
      ) : error ? (
        <div className="salas-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={cargar}>
            Reintentar
          </button>
        </div>
      ) : !espacio ? (
        <p>No se encontró la sala solicitada.</p>
      ) : (
        <>
          <h1>{espacio.nombre}</h1>

          <section className="sala-detalle__info" aria-label="Información de la sala">
            <dl>
              <div><dt>Tipo</dt><dd>{espacio.tipo}</dd></div>
              <div><dt>Capacidad</dt><dd>{espacio.capacidad} personas</dd></div>
              <div><dt>Piso</dt><dd>{espacio.piso}</dd></div>
              <div><dt>Ubicación</dt><dd>{espacio.ubicacion}</dd></div>
            </dl>
          </section>

          <section className="sala-detalle__recursos" aria-label="Características">
            <h2>Características</h2>
            {Array.isArray(espacio.recursos) && espacio.recursos.length > 0 ? (
              <ul className="recursos-lista">
                {espacio.recursos.map((r) => (
                  <li key={r.id_recurso ?? r.nombre}>{r.nombre}</li>
                ))}
              </ul>
            ) : (
              <p>Sin recursos registrados.</p>
            )}
          </section>

          <section className="sala-detalle__reuniones" aria-label="Reuniones programadas">
            <div className="sala-detalle__reuniones-header">
              <h2>Reuniones programadas</h2>
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setErrorForm('');
                  setFormVisible((v) => !v);
                }}
              >
                {formVisible ? 'Cerrar' : 'Agregar reservación'}
              </button>
            </div>

            {feedback && (
              <p
                role={feedback.tipo === 'error' ? 'alert' : 'status'}
                className={`mr-feedback mr-feedback--${feedback.tipo}`}
              >
                {feedback.texto}
              </p>
            )}

            {formVisible && (
              <form className="sala-reserva-form" onSubmit={agregarReservacion} noValidate>
                <label>
                  Fecha
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => actualizarCampo('fecha', e.target.value)}
                  />
                </label>
                <label>
                  Hora de inicio
                  <input
                    type="time"
                    value={form.horaInicio}
                    onChange={(e) => actualizarCampo('horaInicio', e.target.value)}
                  />
                </label>
                <label>
                  Hora de fin
                  <input
                    type="time"
                    value={form.horaFin}
                    onChange={(e) => actualizarCampo('horaFin', e.target.value)}
                  />
                </label>
                <label>
                  Asistentes{Number.isInteger(Number(espacio.capacidad)) ? ` (1 - ${espacio.capacidad})` : ''}
                  <input
                    type="number"
                    min="1"
                    max={espacio.capacidad}
                    value={form.asistentes}
                    onChange={(e) => actualizarCampo('asistentes', e.target.value)}
                  />
                </label>
                {errorForm && (
                  <span className="campo-error" role="alert">
                    {errorForm}
                  </span>
                )}
                <div className="sala-reserva-form__actions">
                  <button type="submit" disabled={creando}>
                    {creando ? 'Creando…' : 'Crear reservación'}
                  </button>
                </div>
              </form>
            )}

            {reunionesProximas.length === 0 ? (
              <p>No hay reuniones programadas próximas.</p>
            ) : (
              <table className="reuniones-table">
                <thead>
                  <tr>
                    <th scope="col">Inicio</th>
                    <th scope="col">Fin</th>
                    <th scope="col">Asistentes</th>
                    <th scope="col">Asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {reunionesProximas.map((r) => {
                    const a = presentarAsistencia(r.estado_asistencia);
                    return (
                      <tr key={r.id_reserva}>
                        <td>{formatFecha(r.fecha_inicio)}</td>
                        <td>{formatFecha(r.fecha_fin)}</td>
                        <td>{r.cantidad_asistentes}</td>
                        <td><span className={a.className}>{a.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  );
}

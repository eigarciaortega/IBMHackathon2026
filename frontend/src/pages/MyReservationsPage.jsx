// "Mis Reservas" (COLABORADOR).
//
// Lista las Reservas del solicitante (pasadas y futuras) y permite, sobre las
// Reservas futuras y activas, editarlas (rango y asistentes) o cancelarlas.
// Usa el booking-service: GET /reservas/mias, PUT /reservas/:id, DELETE /reservas/:id.

import { useCallback, useEffect, useState } from 'react';
import { misReservas, actualizarReserva, cancelarReserva, actualizarAsistencia } from '../api/bookingApi';
import { presentarAsistencia, dentroDeVentanaAsistencia } from '../lib/asistencia';
import './MyReservationsPage.css';

/** Extrae la fecha (YYYY-MM-DD) en UTC de un datetime. */
function fechaUTC(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Extrae la hora (HH:MM) en UTC de un datetime. */
function horaUTC(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(11, 16);
}

/** Formato legible mostrando la misma hora-pared registrada (UTC). */
function formatFecha(valor) {
  const f = fechaUTC(valor);
  if (!f) return String(valor ?? '—');
  return `${f} ${horaUTC(valor)}`;
}

/** Indica si una Reserva es futura (su inicio es posterior a ahora). */
function esFutura(reserva) {
  const inicio = new Date(reserva.fecha_inicio);
  return !Number.isNaN(inicio.getTime()) && inicio.getTime() > Date.now();
}

export default function MyReservationsPage() {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null); // { tipo, texto }

  // Edición inline: id de la Reserva en edición y su formulario.
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ fecha: '', horaInicio: '', horaFin: '', asistentes: '' });
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cancelandoId, setCancelandoId] = useState(null);
  const [registrandoId, setRegistrandoId] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await misReservas();
      setReservas(Array.isArray(data?.reservas) ? data.reservas : []);
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar tus reservas.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function abrirEdicion(reserva) {
    setEditandoId(reserva.id_reserva);
    setForm({
      fecha: fechaUTC(reserva.fecha_inicio),
      horaInicio: horaUTC(reserva.fecha_inicio),
      horaFin: horaUTC(reserva.fecha_fin),
      asistentes: reserva.cantidad_asistentes != null ? String(reserva.cantidad_asistentes) : '',
    });
    setErrorForm('');
    setFeedback(null);
  }

  function cerrarEdicion() {
    setEditandoId(null);
    setErrorForm('');
  }

  function actualizarCampo(campo, valor) {
    setForm((previo) => ({ ...previo, [campo]: valor }));
  }

  async function guardarEdicion(evento, reserva) {
    evento.preventDefault();
    setErrorForm('');

    // Validación de cliente mínima (el backend re-valida y verifica solapamiento).
    if (!form.fecha || !form.horaInicio || !form.horaFin) {
      setErrorForm('Completa fecha, hora de inicio y hora de fin.');
      return;
    }
    if (form.horaFin <= form.horaInicio) {
      setErrorForm('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    const asistentes = Number(form.asistentes);
    if (!Number.isInteger(asistentes) || asistentes < 1) {
      setErrorForm('El número de asistentes debe ser un entero mayor o igual a 1.');
      return;
    }

    setGuardando(true);
    try {
      await actualizarReserva(reserva.id_reserva, {
        idEspacio: reserva.id_espacio,
        fechaInicio: `${form.fecha}T${form.horaInicio}:00Z`,
        fechaFin: `${form.fecha}T${form.horaFin}:00Z`,
        asistentes,
      });
      await cargar();
      setEditandoId(null);
      setFeedback({ tipo: 'exito', texto: 'Reserva actualizada correctamente.' });
    } catch (err) {
      // Conservar el formulario y mostrar el motivo del rechazo (p. ej. 409).
      setErrorForm(err?.message || 'No se pudo actualizar la reserva.');
    } finally {
      setGuardando(false);
    }
  }

  async function cancelar(reserva) {
    setFeedback(null);
    setCancelandoId(reserva.id_reserva);
    try {
      await cancelarReserva(reserva.id_reserva);
      await cargar();
      setFeedback({ tipo: 'exito', texto: 'Reserva cancelada correctamente.' });
    } catch (err) {
      setFeedback({ tipo: 'error', texto: err?.message || 'No se pudo cancelar la reserva.' });
    } finally {
      setCancelandoId(null);
    }
  }

  /** Registra la asistencia ('show' | 'no-show') de una reserva propia. */
  async function registrarAsistencia(reserva, estado) {
    setFeedback(null);
    setRegistrandoId(reserva.id_reserva);
    try {
      await actualizarAsistencia(reserva.id_reserva, estado);
      await cargar();
      setFeedback({ tipo: 'exito', texto: 'Asistencia registrada.' });
    } catch (err) {
      setFeedback({ tipo: 'error', texto: err?.message || 'No se pudo registrar la asistencia.' });
    } finally {
      setRegistrandoId(null);
    }
  }

  return (
    <main className="page page--my-reservations">
      <h1>Mis reservas</h1>

      {feedback && (
        <p
          role={feedback.tipo === 'error' ? 'alert' : 'status'}
          className={`mr-feedback mr-feedback--${feedback.tipo}`}
        >
          {feedback.texto}
        </p>
      )}

      {error && !cargando && (
        <div className="mr-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={cargar}>
            Reintentar
          </button>
        </div>
      )}

      {cargando ? (
        <p role="status">Cargando…</p>
      ) : reservas.length === 0 ? (
        <p>No tienes reservas registradas.</p>
      ) : (
        <table className="mr-table">
          <thead>
            <tr>
              <th scope="col">Espacio</th>
              <th scope="col">Inicio</th>
              <th scope="col">Fin</th>
              <th scope="col">Asistentes</th>
              <th scope="col">Estado</th>
              <th scope="col">Asistencia</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map((reserva) => {
              const editable = esFutura(reserva) && reserva.estado_reserva !== 'Cancelado';
              const enEdicion = editandoId === reserva.id_reserva;
              return (
                <tr key={reserva.id_reserva}>
                  <td>{reserva.espacio_nombre ?? reserva.id_espacio}</td>
                  <td>{formatFecha(reserva.fecha_inicio)}</td>
                  <td>{formatFecha(reserva.fecha_fin)}</td>
                  <td>{reserva.cantidad_asistentes}</td>
                  <td>
                    <span className={`estado estado--${reserva.estado_reserva}`}>
                      {reserva.estado_reserva}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const a = presentarAsistencia(reserva.estado_asistencia);
                      return <span className={a.className}>{a.label}</span>;
                    })()}
                    {reserva.estado_reserva !== 'Cancelado' &&
                      dentroDeVentanaAsistencia(reserva) && (
                        <div className="mr-asistencia">
                          <button
                            type="button"
                            onClick={() => registrarAsistencia(reserva, 'show')}
                            disabled={registrandoId === reserva.id_reserva}
                          >
                            Marcar SHOW
                          </button>
                          <button
                            type="button"
                            onClick={() => registrarAsistencia(reserva, 'no-show')}
                            disabled={registrandoId === reserva.id_reserva}
                          >
                            Marcar NO_SHOW
                          </button>
                        </div>
                      )}
                  </td>
                  <td className="mr-table__actions">
                    {editable ? (
                      <>
                        <button type="button" onClick={() => abrirEdicion(reserva)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="boton--peligro"
                          onClick={() => cancelar(reserva)}
                          disabled={cancelandoId === reserva.id_reserva}
                        >
                          {cancelandoId === reserva.id_reserva ? 'Cancelando…' : 'Cancelar'}
                        </button>
                      </>
                    ) : (
                      <span className="mr-table__nota">—</span>
                    )}

                    {enEdicion && (
                      <form className="mr-edit" onSubmit={(e) => guardarEdicion(e, reserva)} noValidate>
                        <label>
                          Fecha
                          <input
                            type="date"
                            value={form.fecha}
                            onChange={(e) => actualizarCampo('fecha', e.target.value)}
                          />
                        </label>
                        <label>
                          Inicio
                          <input
                            type="time"
                            value={form.horaInicio}
                            onChange={(e) => actualizarCampo('horaInicio', e.target.value)}
                          />
                        </label>
                        <label>
                          Fin
                          <input
                            type="time"
                            value={form.horaFin}
                            onChange={(e) => actualizarCampo('horaFin', e.target.value)}
                          />
                        </label>
                        <label>
                          Asistentes
                          <input
                            type="number"
                            min="1"
                            value={form.asistentes}
                            onChange={(e) => actualizarCampo('asistentes', e.target.value)}
                          />
                        </label>
                        {errorForm && (
                          <span className="campo-error" role="alert">
                            {errorForm}
                          </span>
                        )}
                        <div className="mr-edit__actions">
                          <button type="submit" disabled={guardando}>
                            {guardando ? 'Guardando…' : 'Guardar cambios'}
                          </button>
                          <button type="button" onClick={cerrarEdicion} disabled={guardando}>
                            Cancelar edición
                          </button>
                        </div>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}

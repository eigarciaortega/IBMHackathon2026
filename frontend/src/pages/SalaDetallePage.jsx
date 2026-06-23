// Detalle de una sala (COLABORADOR / ADMINISTRADOR).
//
// Muestra la información de la sala, sus características (recursos) y las
// reuniones programadas en orden de fecha próxima. Se accede desde la lista de
// Salas; si se entra directo por URL, recupera los datos del backend.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { listEspacios } from '../api/catalogApi';
import { agenda } from '../api/bookingApi';
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
            <h2>Reuniones programadas</h2>
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

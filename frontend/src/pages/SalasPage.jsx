// Salas (COLABORADOR / ADMINISTRADOR).
//
// Lista todas las salas existentes e indica si tienen reuniones programadas
// (próximas). Al seleccionar una sala se abre su página de detalle con sus
// características y las reuniones en orden de fecha próxima.
//
// Usa catalog-service (GET /espacios) y booking-service (GET /agenda).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listEspacios } from '../api/catalogApi';
import { agenda } from '../api/bookingApi';
import './SalasPage.css';

export default function SalasPage() {
  const navigate = useNavigate();
  const [espacios, setEspacios] = useState([]);
  const [reuniones, setReuniones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [dataEspacios, dataAgenda] = await Promise.all([listEspacios(), agenda()]);
      setEspacios(Array.isArray(dataEspacios?.espacios) ? dataEspacios.espacios : []);
      setReuniones(Array.isArray(dataAgenda?.reservas) ? dataAgenda.reservas : []);
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar las salas.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Reuniones futuras agrupadas por id de espacio.
  const reunionesPorEspacio = useMemo(() => {
    const ahora = Date.now();
    const mapa = new Map();
    for (const r of reuniones) {
      const fin = new Date(r.fecha_fin).getTime();
      if (Number.isNaN(fin) || fin < ahora) continue; // solo próximas/vigentes
      if (!mapa.has(r.id_espacio)) mapa.set(r.id_espacio, []);
      mapa.get(r.id_espacio).push(r);
    }
    return mapa;
  }, [reuniones]);

  function abrirDetalle(espacio) {
    const proximas = reunionesPorEspacio.get(espacio.id_espacio) || [];
    navigate(`/salas/${espacio.id_espacio}`, { state: { espacio, reuniones: proximas } });
  }

  return (
    <main className="page page--salas">
      <h1>Salas</h1>

      {error && !cargando && (
        <div className="salas-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={cargar}>
            Reintentar
          </button>
        </div>
      )}

      {cargando ? (
        <p role="status">Cargando…</p>
      ) : espacios.length === 0 ? (
        <p>No hay salas registradas.</p>
      ) : (
        <ul className="salas-grid">
          {espacios.map((espacio) => {
            const proximas = reunionesPorEspacio.get(espacio.id_espacio) || [];
            const tieneReuniones = proximas.length > 0;
            return (
              <li key={espacio.id_espacio} className="sala-card">
                <button type="button" className="sala-card__btn" onClick={() => abrirDetalle(espacio)}>
                  <span className="sala-card__nombre">{espacio.nombre}</span>
                  <span className="sala-card__meta">
                    {espacio.tipo} · Capacidad {espacio.capacidad} · Piso {espacio.piso} ·{' '}
                    {espacio.ubicacion}
                  </span>
                  <span
                    className={`sala-card__estado ${
                      tieneReuniones ? 'sala-card__estado--ocupada' : 'sala-card__estado--libre'
                    }`}
                  >
                    {tieneReuniones
                      ? `${proximas.length} reunión(es) programada(s)`
                      : 'Sin reuniones programadas'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

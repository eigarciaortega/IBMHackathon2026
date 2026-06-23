import { useState, useEffect } from 'react';
import { reservationService } from '../services/api';
import { format } from 'date-fns';
import '../styles/MyReservations.css';

function MyReservations({ user, onNavigate }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await reservationService.getReservations();
      setReservations(data.items || []);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cargar las reservas' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (id) => {
    if (!confirm('¿Estás seguro de que deseas cancelar esta reserva?')) {
      return;
    }

    try {
      await reservationService.cancelReservation(id);
      setMessage({ type: 'success', text: 'Reserva cancelada exitosamente' });
      loadReservations();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Error al cancelar la reserva',
      });
    }
  };

  const filteredReservations = reservations.filter((reservation) => {
    if (filter && reservation.estado !== filter) return false;
    return true;
  });

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="my-reservations">
      <div className="header">
        <div className="header-content">
          <h1>Mis Reservas</h1>
          <div className="header-actions">
            <span>Hola, {user.nombre}</span>
            <button onClick={() => onNavigate('search')} className="btn btn-secondary">
              Buscar Espacios
            </button>
            <button onClick={() => onNavigate('logout')} className="btn btn-secondary">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {message.text && (
          <div className={`card ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="card">
          <div className="filters-bar">
            <h2>Filtrar por estado</h2>
            <div className="filter-buttons">
              <button
                className={`btn ${filter === '' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('')}
              >
                Todas
              </button>
              <button
                className={`btn ${filter === 'abierto' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('abierto')}
              >
                Activas
              </button>
              <button
                className={`btn ${filter === 'cancelado' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('cancelado')}
              >
                Canceladas
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">Cargando reservas...</div>
        ) : filteredReservations.length === 0 ? (
          <div className="empty-state">
            <h3>No tienes reservas</h3>
            <p>Comienza buscando espacios disponibles</p>
            <button onClick={() => onNavigate('search')} className="btn btn-primary">
              Buscar Espacios
            </button>
          </div>
        ) : (
          <div className="reservations-list">
            {filteredReservations.map((reservation) => (
              <div key={reservation.id} className="reservation-card">
                <div className="reservation-header">
                  <div>
                    <h3>{reservation.sala.nombre}</h3>
                    <p className="reservation-type">
                      {reservation.sala.tipo === 'sala' ? 'Sala' : 'Escritorio'} - Capacidad: {reservation.sala.capacidad}
                    </p>
                  </div>
                  <span className={`badge badge-${reservation.estado === 'abierto' ? 'success' : 'danger'}`}>
                    {reservation.estado === 'abierto' ? 'Activa' : 'Cancelada'}
                  </span>
                </div>

                <div className="reservation-details">
                  <div className="detail-row">
                    <span className="detail-label">Inicio:</span>
                    <span className="detail-value">{formatDate(reservation.fecha_inicio)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Fin:</span>
                    <span className="detail-value">{formatDate(reservation.fecha_fin)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Asistentes:</span>
                    <span className="detail-value">{reservation.cantidad_personas} personas</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Creada:</span>
                    <span className="detail-value">{formatDate(reservation.created_at)}</span>
                  </div>
                </div>

                {reservation.estado === 'abierto' && (
                  <div className="reservation-actions">
                    <button
                      onClick={() => handleCancelReservation(reservation.id)}
                      className="btn btn-danger"
                    >
                      Cancelar Reserva
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyReservations;

// Made with Bob

import { useState, useEffect } from 'react';
import { roomService, reservationService } from '../services/api';
import { format } from 'date-fns';
import '../styles/SearchRooms.css';

function SearchRooms({ user, onNavigate }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    tipo: '',
    capacidad: '',
  });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [reservationData, setReservationData] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    cantidad_personas: 1,
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadRooms();
  }, [search]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await roomService.getRooms(1, 50, search);
      setRooms(data.items || []);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cargar las salas' });
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter((room) => {
    if (filters.tipo && room.tipo !== filters.tipo) return false;
    if (filters.capacidad && room.capacidad < parseInt(filters.capacidad)) return false;
    return true;
  });

  const handleReserve = (room) => {
    setSelectedRoom(room);
    setMessage({ type: '', text: '' });
  };

  const handleSubmitReservation = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      await reservationService.createReservation({
        sala_id: selectedRoom.id,
        usuario_id: user.id,
        fecha_inicio: new Date(reservationData.fecha_inicio).toISOString(),
        fecha_fin: new Date(reservationData.fecha_fin).toISOString(),
        cantidad_personas: parseInt(reservationData.cantidad_personas),
      });

      setMessage({ type: 'success', text: '¡Reserva creada exitosamente!' });
      setSelectedRoom(null);
      setReservationData({
        fecha_inicio: '',
        fecha_fin: '',
        cantidad_personas: 1,
      });
      loadRooms();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Error al crear la reserva',
      });
    }
  };

  return (
    <div className="search-rooms">
      <div className="header">
        <div className="header-content">
          <h1>Buscar Espacios</h1>
          <div className="header-actions">
            <span>Hola, {user.nombre}</span>
            <button onClick={() => onNavigate('reservations')} className="btn btn-secondary">
              Mis Reservas
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
          <h2>Filtros de Búsqueda</h2>
          <div className="filters">
            <div className="form-group">
              <label>Buscar por nombre</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre de la sala..."
              />
            </div>

            <div className="form-group">
              <label>Tipo de espacio</label>
              <select
                value={filters.tipo}
                onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
              >
                <option value="">Todos</option>
                <option value="sala">Sala</option>
                <option value="escritorio">Escritorio</option>
              </select>
            </div>

            <div className="form-group">
              <label>Capacidad mínima</label>
              <input
                type="number"
                value={filters.capacidad}
                onChange={(e) => setFilters({ ...filters, capacidad: e.target.value })}
                placeholder="Ej: 5"
                min="1"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">Cargando espacios...</div>
        ) : filteredRooms.length === 0 ? (
          <div className="empty-state">
            <h3>No se encontraron espacios</h3>
            <p>Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          <div className="rooms-grid">
            {filteredRooms.map((room) => (
              <div key={room.id} className="room-card">
                <div className="room-header">
                  <h3>{room.nombre}</h3>
                  <span className={`badge badge-${room.estado === 'disponible' ? 'success' : 'warning'}`}>
                    {room.estado}
                  </span>
                </div>
                <div className="room-details">
                  <p><strong>Tipo:</strong> {room.tipo === 'sala' ? 'Sala' : 'Escritorio'}</p>
                  <p><strong>Capacidad:</strong> {room.capacidad} personas</p>
                  {room.recursos && room.recursos.length > 0 && (
                    <div className="room-resources">
                      <strong>Recursos:</strong>
                      <div className="resources-list">
                        {room.recursos.map((recurso, idx) => (
                          <span key={idx} className="badge badge-info">{recurso}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleReserve(room)}
                  className="btn btn-primary btn-block"
                  disabled={room.estado !== 'disponible'}
                >
                  {room.estado === 'disponible' ? 'Reservar' : 'No disponible'}
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedRoom && (
          <div className="modal-overlay" onClick={() => setSelectedRoom(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Confirmar Reserva</h2>
              <div className="reservation-summary">
                <h3>{selectedRoom.nombre}</h3>
                <p>Tipo: {selectedRoom.tipo === 'sala' ? 'Sala' : 'Escritorio'}</p>
                <p>Capacidad: {selectedRoom.capacidad} personas</p>
              </div>

              <form onSubmit={handleSubmitReservation}>
                <div className="form-group">
                  <label>Fecha y hora de inicio</label>
                  <input
                    type="datetime-local"
                    value={reservationData.fecha_inicio}
                    onChange={(e) =>
                      setReservationData({ ...reservationData, fecha_inicio: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Fecha y hora de fin</label>
                  <input
                    type="datetime-local"
                    value={reservationData.fecha_fin}
                    onChange={(e) =>
                      setReservationData({ ...reservationData, fecha_fin: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Número de asistentes</label>
                  <input
                    type="number"
                    value={reservationData.cantidad_personas}
                    onChange={(e) =>
                      setReservationData({ ...reservationData, cantidad_personas: e.target.value })
                    }
                    min="1"
                    max={selectedRoom.capacidad}
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" onClick={() => setSelectedRoom(null)} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-success">
                    Confirmar Reserva
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchRooms;

// Made with Bob

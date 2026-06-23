import { useState, useEffect } from 'react';
import { roomService, reservationService } from '../services/api';
import '../styles/AdminPanel.css';

function AdminPanel({ user, onNavigate }) {
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [roomForm, setRoomForm] = useState({
    nombre: '',
    tipo: 'sala',
    capacidad: 1,
    recursos: [],
  });
  const [newRecurso, setNewRecurso] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roomsData, reservationsData] = await Promise.all([
        roomService.getRooms(1, 100),
        reservationService.getReservations(),
      ]);
      setRooms(roomsData.items || []);
      setReservations(reservationsData.items || []);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cargar los datos' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = () => {
    setEditingRoom(null);
    setRoomForm({
      nombre: '',
      tipo: 'sala',
      capacidad: 1,
      recursos: [],
    });
    setShowModal(true);
    setMessage({ type: '', text: '' });
  };

  const handleEditRoom = (room) => {
    setEditingRoom(room);
    setRoomForm({
      nombre: room.nombre,
      tipo: room.tipo,
      capacidad: room.capacidad,
      recursos: room.recursos || [],
    });
    setShowModal(true);
    setMessage({ type: '', text: '' });
  };

  const handleDeleteRoom = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta sala?')) {
      return;
    }

    try {
      await roomService.deleteRoom(id);
      setMessage({ type: 'success', text: 'Sala eliminada exitosamente' });
      loadData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Error al eliminar la sala',
      });
    }
  };

  const handleSubmitRoom = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      if (editingRoom) {
        await roomService.updateRoom(editingRoom.id, roomForm);
        setMessage({ type: 'success', text: 'Sala actualizada exitosamente' });
      } else {
        await roomService.createRoom(roomForm);
        setMessage({ type: 'success', text: 'Sala creada exitosamente' });
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Error al guardar la sala',
      });
    }
  };

  const handleAddRecurso = () => {
    if (newRecurso.trim() && !roomForm.recursos.includes(newRecurso.trim())) {
      setRoomForm({
        ...roomForm,
        recursos: [...roomForm.recursos, newRecurso.trim()],
      });
      setNewRecurso('');
    }
  };

  const handleRemoveRecurso = (recurso) => {
    setRoomForm({
      ...roomForm,
      recursos: roomForm.recursos.filter((r) => r !== recurso),
    });
  };

  const stats = {
    totalRooms: rooms.length,
    availableRooms: rooms.filter((r) => r.estado === 'disponible').length,
    occupiedRooms: rooms.filter((r) => r.estado === 'ocupado').length,
    activeReservations: reservations.filter((r) => r.estado === 'abierto').length,
  };

  return (
    <div className="admin-panel">
      <div className="header">
        <div className="header-content">
          <h1>Panel de Administración</h1>
          <div className="header-actions">
            <span>Hola, {user.nombre}</span>
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

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total de Espacios</h3>
            <p className="stat-value">{stats.totalRooms}</p>
          </div>
          <div className="stat-card">
            <h3>Espacios Disponibles</h3>
            <p className="stat-value success">{stats.availableRooms}</p>
          </div>
          <div className="stat-card">
            <h3>Espacios Ocupados</h3>
            <p className="stat-value warning">{stats.occupiedRooms}</p>
          </div>
          <div className="stat-card">
            <h3>Reservas Activas</h3>
            <p className="stat-value info">{stats.activeReservations}</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Gestión de Espacios</h2>
            <button onClick={handleCreateRoom} className="btn btn-primary">
              + Crear Espacio
            </button>
          </div>

          {loading ? (
            <div className="loading">Cargando espacios...</div>
          ) : rooms.length === 0 ? (
            <div className="empty-state">
              <h3>No hay espacios registrados</h3>
              <p>Comienza creando un nuevo espacio</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Capacidad</th>
                    <th>Estado</th>
                    <th>Recursos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr key={room.id}>
                      <td>{room.nombre}</td>
                      <td>{room.tipo === 'sala' ? 'Sala' : 'Escritorio'}</td>
                      <td>{room.capacidad}</td>
                      <td>
                        <span className={`badge badge-${room.estado === 'disponible' ? 'success' : 'warning'}`}>
                          {room.estado}
                        </span>
                      </td>
                      <td>
                        <div className="resources-list">
                          {room.recursos && room.recursos.length > 0
                            ? room.recursos.map((r, idx) => (
                                <span key={idx} className="badge badge-info">
                                  {r}
                                </span>
                              ))
                            : '-'}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button onClick={() => handleEditRoom(room)} className="btn btn-sm btn-secondary">
                            Editar
                          </button>
                          <button onClick={() => handleDeleteRoom(room.id)} className="btn btn-sm btn-danger">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{editingRoom ? 'Editar Espacio' : 'Crear Nuevo Espacio'}</h2>

              <form onSubmit={handleSubmitRoom}>
                <div className="form-group">
                  <label>Nombre del espacio</label>
                  <input
                    type="text"
                    value={roomForm.nombre}
                    onChange={(e) => setRoomForm({ ...roomForm, nombre: e.target.value })}
                    required
                    placeholder="Ej: Sala de Juntas A"
                  />
                </div>

                <div className="form-group">
                  <label>Tipo</label>
                  <select
                    value={roomForm.tipo}
                    onChange={(e) => setRoomForm({ ...roomForm, tipo: e.target.value })}
                    required
                  >
                    <option value="sala">Sala</option>
                    <option value="escritorio">Escritorio</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Capacidad</label>
                  <input
                    type="number"
                    value={roomForm.capacidad}
                    onChange={(e) => setRoomForm({ ...roomForm, capacidad: parseInt(e.target.value) })}
                    required
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>Recursos</label>
                  <div className="recursos-input">
                    <input
                      type="text"
                      value={newRecurso}
                      onChange={(e) => setNewRecurso(e.target.value)}
                      placeholder="Ej: Proyector"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRecurso())}
                    />
                    <button type="button" onClick={handleAddRecurso} className="btn btn-secondary">
                      Agregar
                    </button>
                  </div>
                  <div className="recursos-list">
                    {roomForm.recursos.map((recurso, idx) => (
                      <span key={idx} className="badge badge-info">
                        {recurso}
                        <button
                          type="button"
                          onClick={() => handleRemoveRecurso(recurso)}
                          className="badge-close"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-success">
                    {editingRoom ? 'Actualizar' : 'Crear'}
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

export default AdminPanel;

// Made with Bob

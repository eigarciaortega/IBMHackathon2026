import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBookings, cancelBooking, createBooking } from '../services/api';

function MyBookingsPage() {
  const navigate = useNavigate();
  const email = localStorage.getItem('email');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingBooking, setEditingBooking] = useState(null);
  const [editForm, setEditForm] = useState({
    date: '', start_time: '', end_time: '', attendees: 1
  });

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const response = await getMyBookings();
      setBookings(response.data);
    } catch (err) {
      setError('Error al cargar tus reservas.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('¿Estás seguro de cancelar esta reserva?')) return;
    try {
      await cancelBooking(id);
      setMessage('✅ Reserva cancelada correctamente.');
      loadBookings();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cancelar la reserva.');
    }
  };

  const handleEditClick = (booking) => {
    // Extraemos fecha y hora de la reserva existente
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);
    setEditingBooking(booking);
    setEditForm({
      date: startDate.toISOString().split('T')[0],
      start_time: startDate.toTimeString().slice(0, 5),
      end_time: endDate.toTimeString().slice(0, 5),
      attendees: booking.attendees
    });
  };

  const handleEditSave = async () => {
    try {
      // Cancelamos la reserva actual
      await cancelBooking(editingBooking.id);

      // Creamos una nueva con los datos actualizados
      await createBooking({
        space_id: editingBooking.space_id,
        date: editForm.date,
        start_time: editForm.start_time,
        end_time: editForm.end_time,
        attendees: parseInt(editForm.attendees)
      });

      setMessage('✅ Reserva modificada correctamente.');
      setEditingBooking(null);
      loadBookings();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al modificar la reserva.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const formatDateTime = (datetime) => {
    const date = new Date(datetime);
    return date.toLocaleString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getBookingStatus = (booking) => {
    if (booking.status === 'CANCELLED') {
      return { label: '❌ Cancelada', bg: '#fed7d7', color: '#9b2c2c', border: '#e53e3e' };
    }
    const endTime = new Date(booking.end_time);
    const now = new Date();
    if (endTime < now) {
      return { label: '🏁 Finalizada', bg: '#e2e8f0', color: '#4a5568', border: '#a0aec0' };
    }
    return { label: '✅ Activa', bg: '#c6f6d5', color: '#276749', border: '#48bb78' };
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🏢 OfficeSpace</h1>
        <div>
          <span style={styles.userInfo}>👤 {email}</span>
          <button onClick={() => navigate('/search')} style={styles.navBtn}>Buscar Espacios</button>
          <button onClick={handleLogout} style={styles.logoutBtn}>Cerrar Sesión</button>
        </div>
      </div>

      <div style={styles.content}>
        <h2>📋 Mis Reservas</h2>

        {error && <p style={styles.error}>{error}</p>}
        {message && <p style={styles.success}>{message}</p>}

        {/* Formulario de edición */}
        {editingBooking && (
          <div style={styles.editCard}>
            <h3>✏️ Modificar Reserva — {editingBooking.space_name}</h3>
            <div style={styles.editRow}>
              <div style={styles.editField}>
                <label style={styles.label}>Nueva fecha</label>
                <input type="date" value={editForm.date}
                  onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                  style={styles.input} />
              </div>
              <div style={styles.editField}>
                <label style={styles.label}>Hora inicio</label>
                <input type="time" value={editForm.start_time}
                  onChange={(e) => setEditForm({...editForm, start_time: e.target.value})}
                  style={styles.input} />
              </div>
              <div style={styles.editField}>
                <label style={styles.label}>Hora fin</label>
                <input type="time" value={editForm.end_time}
                  onChange={(e) => setEditForm({...editForm, end_time: e.target.value})}
                  style={styles.input} />
              </div>
              <div style={styles.editField}>
                <label style={styles.label}>Asistentes</label>
                <input type="number" value={editForm.attendees} min="1"
                  onChange={(e) => setEditForm({...editForm, attendees: e.target.value})}
                  style={styles.input} />
              </div>
            </div>
            <div style={styles.editButtons}>
              <button onClick={() => setEditingBooking(null)} style={styles.cancelEditBtn}>
                Cancelar
              </button>
              <button onClick={handleEditSave} style={styles.saveBtn}>
                💾 Guardar cambios
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p>Cargando reservas...</p>
        ) : bookings.length === 0 ? (
          <div style={styles.empty}>
            <p>No tienes reservas activas.</p>
            <button onClick={() => navigate('/search')} style={styles.searchBtn}>
              Buscar un espacio
            </button>
          </div>
        ) : (
          <div style={styles.list}>
            {bookings.map(booking => {
              const status = getBookingStatus(booking);
              return (
                <div key={booking.id} style={{
                  ...styles.card,
                  borderLeft: `4px solid ${status.border}`
                }}>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.spaceName}>{booking.space_name}</h3>
                    <span style={{
                      ...styles.status,
                      backgroundColor: status.bg,
                      color: status.color
                    }}>
                      {status.label}
                    </span>
                  </div>
                  <p>📍 {booking.floor} — {booking.type === 'SALA' ? 'Sala de juntas' : 'Escritorio'}</p>
                  <p>🕐 Inicio: {formatDateTime(booking.start_time)}</p>
                  <p>🕐 Fin: {formatDateTime(booking.end_time)}</p>
                  <p>👥 Asistentes: {booking.attendees}</p>

                  {booking.status === 'ACTIVE' && new Date(booking.end_time) > new Date() && (
                    <div style={styles.actionButtons}>
                      <button onClick={() => handleEditClick(booking)} style={styles.editBtn}>
                        ✏️ Modificar
                      </button>
                      <button onClick={() => handleCancel(booking.id)} style={styles.cancelBtn}>
                        🗑️ Cancelar Reserva
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f0f2f5' },
  header: {
    backgroundColor: '#4f46e5', color: 'white', padding: '16px 32px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  title: { margin: 0, fontSize: '24px' },
  userInfo: { marginRight: '16px', fontSize: '14px' },
  navBtn: {
    padding: '8px 16px', marginRight: '8px', backgroundColor: 'transparent',
    color: 'white', border: '1px solid white', borderRadius: '6px', cursor: 'pointer'
  },
  logoutBtn: {
    padding: '8px 16px', backgroundColor: '#e53e3e',
    color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
  },
  content: { padding: '32px', maxWidth: '900px', margin: '0 auto' },
  error: { color: '#e53e3e', backgroundColor: '#fff5f5', padding: '10px', borderRadius: '6px', marginBottom: '16px' },
  success: { color: '#276749', backgroundColor: '#c6f6d5', padding: '10px', borderRadius: '6px', marginBottom: '16px' },
  empty: { textAlign: 'center', padding: '48px', backgroundColor: 'white', borderRadius: '12px' },
  searchBtn: {
    padding: '12px 24px', backgroundColor: '#4f46e5',
    color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '16px'
  },
  list: { display: 'flex', flexDirection: 'column', gap: '16px' },
  card: {
    backgroundColor: 'white', padding: '24px',
    borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  spaceName: { color: '#4f46e5', margin: 0 },
  status: { padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' },
  actionButtons: { display: 'flex', gap: '8px', marginTop: '12px' },
  editBtn: {
    padding: '8px 16px', backgroundColor: '#4f46e5',
    color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
  },
  cancelBtn: {
    padding: '8px 16px', backgroundColor: '#e53e3e',
    color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
  },
  editCard: {
    backgroundColor: 'white', padding: '24px', borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '24px',
    borderLeft: '4px solid #4f46e5'
  },
  editRow: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px' },
  editField: { flex: 1, minWidth: '150px' },
  label: { display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#333' },
  input: {
    width: '100%', padding: '10px', borderRadius: '6px',
    border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box'
  },
  editButtons: { display: 'flex', gap: '12px', marginTop: '16px' },
  cancelEditBtn: {
    padding: '10px 20px', backgroundColor: '#e2e8f0',
    color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer'
  },
  saveBtn: {
    padding: '10px 20px', backgroundColor: '#48bb78',
    color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
  }
};

export default MyBookingsPage;
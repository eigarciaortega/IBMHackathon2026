import { useState, useEffect } from 'react';
import { getSpaces, createSpace, updateSpace, deleteSpace, getTodayBookings, getBookingsByDate } from '../services/api';

const AdminPage = () => {
  const [spaces, setSpaces] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState('spaces');
  const [showForm, setShowForm] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Fecha actual en formato YYYY-MM-DD
  const [form, setForm] = useState({
    nombre: '', tipo: 'SALA', capacidad: '',
    piso: '', con_proyector: false, con_aire: false,
    con_pizarron: false, con_tv: false
  });

  const fetchSpaces = async () => {
    const res = await getSpaces();
    setSpaces(res.data);
  };

  const fetchBookings = async (fecha) => {
    try {
      const res = await getBookingsByDate(fecha);
      setBookings(res.data);
    } catch (err) {
      console.error('Error al cargar reservas:', err);
      setBookings([]);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  // Actualizar reservas cuando cambia la fecha seleccionada
  useEffect(() => {
    if (tab === 'bookings') {
      fetchBookings(selectedDate);
    }
  }, [selectedDate, tab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSpace) {
        await updateSpace(editingSpace.id, form);
      } else {
        await createSpace(form);
      }
      setShowForm(false);
      setEditingSpace(null);
      setForm({ nombre: '', tipo: 'SALA', capacidad: '', piso: '', con_proyector: false, con_aire: false, con_pizarron: false, con_tv: false });
      fetchSpaces();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar');
    }
  };

  const handleEdit = (space) => {
    setEditingSpace(space);
    setForm(space);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este espacio?')) return;
    await deleteSpace(id);
    fetchSpaces();
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  // Función para obtener el nombre del día de la semana
  const getDayName = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem', color: '#1a1a2e' }}>Panel Administrador</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {['spaces', 'bookings'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '0.6rem 1.5rem', borderRadius: '6px', border: 'none', fontWeight: 600,
            background: tab === t ? '#1a1a2e' : '#e0e0e0',
            color: tab === t ? 'white' : '#333'
          }}>
            {t === 'spaces' ? '🏢 Espacios' : '📅 Reservas'}
          </button>
        ))}
      </div>

      {/* Espacios */}
      {tab === 'spaces' && (
        <div>
          <button
            onClick={() => { setShowForm(!showForm); setEditingSpace(null); }}
            style={{
              marginBottom: '1.5rem', padding: '0.65rem 1.5rem',
              background: '#e94560', color: 'white',
              border: 'none', borderRadius: '6px', fontWeight: 600
            }}>
            + Nuevo Espacio
          </button>

          {showForm && (
            <div style={{
              background: 'white', padding: '1.5rem', borderRadius: '10px',
              marginBottom: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
            }}>
              <h3 style={{ marginBottom: '1rem' }}>
                {editingSpace ? 'Editar Espacio' : 'Nuevo Espacio'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Nombre</label>
                    <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Tipo</label>
                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }}>
                      <option value="SALA">Sala</option>
                      <option value="DESK">Escritorio</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Capacidad</label>
                    <input type="number" min="1" required value={form.capacidad}
                      onChange={e => setForm({ ...form, capacidad: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Piso</label>
                    <input value={form.piso} onChange={e => setForm({ ...form, piso: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {['con_proyector', 'con_aire', 'con_pizarron', 'con_tv'].map(key => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form[key]}
                        onChange={e => setForm({ ...form, [key]: e.target.checked })} />
                      {key === 'con_proyector' ? 'Proyector' : key === 'con_aire' ? 'Aire' : key === 'con_pizarron' ? 'Pizarrón' : 'TV'}
                    </label>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" style={{
                    padding: '0.65rem 1.5rem', background: '#1a1a2e',
                    color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600
                  }}>
                    {editingSpace ? 'Guardar Cambios' : 'Crear Espacio'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} style={{
                    padding: '0.65rem 1.5rem', background: '#f0f2f5',
                    border: 'none', borderRadius: '6px', fontWeight: 600
                  }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {spaces.map(space => (
              <div key={space.id} style={{
                background: 'white', padding: '1.5rem',
                borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
              }}>
                <h4 style={{ marginBottom: '0.5rem', color: '#1a1a2e' }}>{space.nombre}</h4>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>{space.tipo} · {space.piso} · {space.capacidad} personas</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button onClick={() => handleEdit(space)} style={{
                    flex: 1, padding: '0.5rem', background: '#1a1a2e',
                    color: 'white', border: 'none', borderRadius: '6px'
                  }}>Editar</button>
                  <button onClick={() => handleDelete(space.id)} style={{
                    flex: 1, padding: '0.5rem', background: '#e94560',
                    color: 'white', border: 'none', borderRadius: '6px'
                  }}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reservas con selector de fecha */}
      {tab === 'bookings' && (
        <div>
          {/* Selector de fecha */}
          <div style={{
            background: 'white', padding: '1.5rem', borderRadius: '10px',
            marginBottom: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#1a1a2e' }}>
                📅 Seleccionar Fecha
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                style={{
                  width: '100%', padding: '0.7rem', borderRadius: '6px',
                  border: '2px solid #1a1a2e', fontSize: '1rem', fontWeight: 600
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Fecha seleccionada:</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e' }}>
                {getDayName(selectedDate)}, {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-MX', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </div>
            </div>
            <div style={{
              background: '#e8f5e9', padding: '1rem', borderRadius: '8px',
              border: '2px solid #4caf50', minWidth: '150px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#2e7d32', marginBottom: '0.25rem' }}>Total Reservas</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2e7d32' }}>{bookings.length}</div>
            </div>
          </div>

          {/* Tabla de reservas */}
          <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1a1a2e', color: 'white' }}>
                  <th style={th}>Espacio</th>
                  <th style={th}>Usuario</th>
                  <th style={th}>Entrada</th>
                  <th style={th}>Salida</th>
                  <th style={th}>Asistentes</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                    No hay reservas para esta fecha
                  </td></tr>
                ) : bookings.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={td}>{b.espacio_nombre}</td>
                    <td style={td}>{b.usuario_nombre}</td>
                    <td style={td}>{new Date(b.hora_entrada).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={td}>{new Date(b.hora_salida).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={td}>{b.asistentes}</td>
                    <td style={td}>
                      <span style={{
                        background: b.status === 'CONFIRMED' ? '#e8f5e9' : b.status === 'PENDING' ? '#fff3e0' : '#ffebee',
                        color: b.status === 'CONFIRMED' ? '#2e7d32' : b.status === 'PENDING' ? '#f57c00' : '#c62828',
                        padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600
                      }}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const th = { padding: '1rem', textAlign: 'left', fontWeight: 600 };
const td = { padding: '1rem', fontSize: '0.9rem' };

export default AdminPage;

// Made with Bob

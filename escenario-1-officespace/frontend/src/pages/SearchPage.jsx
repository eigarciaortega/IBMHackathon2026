import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableSpaces } from '../services/api';

function SearchPage() {
  const navigate = useNavigate();
  const email = localStorage.getItem('email');

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [type, setType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [floor, setFloor] = useState('');
  const [resources, setResources] = useState({
    has_projector: false,
    has_ac: false,
    has_microphone: false,
    has_screen: false,
    has_long_tables: false,
    has_movable_chairs: false,
    has_whiteboard: false
  });
  const [spaces, setSpaces] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDateChange = (e) => {
    setDate(e.target.value);
    setSpaces([]);
    setSearched(false);
    setError('');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Si vienen horas, validamos que sean correctas
    if (startTime && endTime && endTime <= startTime) {
      setError('⚠️ La hora de fin debe ser mayor a la hora de inicio.');
      setLoading(false);
      return;
    }

    // Si viene hora de inicio, validamos que no haya pasado
    if (startTime) {
      const ahora = new Date();
      const fechaHoraInicio = new Date(`${date}T${startTime}`);
      if (fechaHoraInicio < ahora) {
        setError('⚠️ La hora de inicio ya pasó. Por favor selecciona un horario futuro.');
        setLoading(false);
        return;
      }
    }

    try {
      const response = await getAvailableSpaces({
        date,
        start_time: startTime || '00:00',
        end_time: endTime || '23:59',
        type,
        capacity
      });

      // Filtramos por piso y recursos en el frontend
      let filtered = response.data;

      if (floor) {
        filtered = filtered.filter(s => s.floor === floor);
      }

      if (resources.has_projector) filtered = filtered.filter(s => s.has_projector);
      if (resources.has_ac) filtered = filtered.filter(s => s.has_ac);
      if (resources.has_microphone) filtered = filtered.filter(s => s.has_microphone);
      if (resources.has_screen) filtered = filtered.filter(s => s.has_screen);
      if (resources.has_long_tables) filtered = filtered.filter(s => s.has_long_tables);
      if (resources.has_movable_chairs) filtered = filtered.filter(s => s.has_movable_chairs);
      if (resources.has_whiteboard) filtered = filtered.filter(s => s.has_whiteboard);

      setSpaces(filtered);
      setSearched(true);
    } catch (err) {
      const mensaje = err.response?.data?.error;
      if (mensaje?.includes('pasado')) {
        setError('⚠️ La fecha seleccionada ya pasó. Por favor selecciona una fecha futura.');
      } else if (mensaje?.includes('hora de fin')) {
        setError('⚠️ La hora de fin debe ser mayor a la hora de inicio.');
      } else {
        setError(`⚠️ ${mensaje || 'Error al buscar espacios.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = (space) => {
    localStorage.setItem('selectedSpace', JSON.stringify(space));
    localStorage.setItem('bookingData', JSON.stringify({
      date, start_time: startTime, end_time: endTime
    }));
    navigate('/confirm');
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🏢 OfficeSpace</h1>
        <div>
          <span style={styles.userInfo}>👤 {email}</span>
          <button onClick={() => navigate('/my-bookings')} style={styles.navBtn}>Mis Reservas</button>
          <button onClick={handleLogout} style={styles.logoutBtn}>Cerrar Sesión</button>
        </div>
      </div>

      <div style={styles.content}>
        <h2>Buscar Espacios Disponibles</h2>

        <form onSubmit={handleSearch} style={styles.form}>
          {/* Fila 1: Fecha y horario */}
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Fecha</label>
              <input type="date" value={date}
                onChange={(e) => setDate(e.target.value)}
                style={styles.input} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Hora inicio</label>
              <input type="time" value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Hora fin</label>
              <input type="time" value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={styles.input} />
            </div>
          </div>

          {/* Fila 2: Tipo, capacidad y piso */}
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Tipo de espacio</label>
              <select value={type} onChange={(e) => setType(e.target.value)} style={styles.input}>
                <option value="">Todos</option>
                <option value="SALA">Sala de juntas</option>
                <option value="DESK">Escritorio</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Capacidad mínima</label>
              <input type="number" value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Ej: 4" style={styles.input} min="1" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Piso</label>
              <select value={floor} onChange={(e) => setFloor(e.target.value)} style={styles.input}>
                <option value="">Todos los pisos</option>
                <option value="Piso 1">Piso 1</option>
                <option value="Piso 2">Piso 2</option>
                <option value="Piso 3">Piso 3</option>
                <option value="Piso 4">Piso 4</option>
              </select>
            </div>
          </div>

          {/* Fila 3: Recursos */}
          <div style={styles.resourcesSection}>
            <label style={styles.label}>Recursos requeridos</label>
            <div style={styles.checkboxRow}>
              {[
                ['has_projector', '📽️ Proyector'],
                ['has_ac', '❄️ Aire acondicionado'],
                ['has_microphone', '🎤 Micrófono'],
                ['has_screen', '🖥️ Pantalla'],
                ['has_long_tables', '🪑 Mesas largas'],
                ['has_movable_chairs', '💺 Sillas movibles'],
                ['has_whiteboard', '📋 Pizarrón']
              ].map(([key, label]) => (
                <label key={key} style={styles.checkbox}>
                  <input type="checkbox" checked={resources[key]}
                    onChange={(e) => setResources({...resources, [key]: e.target.checked})} />
                  {' '}{label}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" style={styles.searchBtn} disabled={loading}>
            {loading ? 'Buscando...' : '🔍 Buscar Espacios'}
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}

        {searched && (
          <div style={styles.results}>
            <h3>Espacios disponibles ({spaces.length})</h3>
            {spaces.length === 0 ? (
              <p style={styles.noResults}>No hay espacios disponibles con los filtros seleccionados.</p>
            ) : (
              <div style={styles.grid}>
                {spaces.map(space => (
                  <div key={space.id} style={styles.card}>
                    <h4 style={styles.spaceName}>{space.name}</h4>
                    <p>📍 {space.floor}</p>
                    <p>👥 Capacidad: {space.capacity} personas</p>
                    <p>🏷️ {space.type === 'SALA' ? 'Sala de juntas' : 'Escritorio'}</p>
                    <div style={styles.amenities}>
                      {space.has_projector && <span style={styles.tag}>📽️ Proyector</span>}
                      {space.has_ac && <span style={styles.tag}>❄️ A/C</span>}
                      {space.has_microphone && <span style={styles.tag}>🎤 Micrófono</span>}
                      {space.has_screen && <span style={styles.tag}>🖥️ Pantalla</span>}
                      {space.has_long_tables && <span style={styles.tag}>🪑 Mesas largas</span>}
                      {space.has_movable_chairs && <span style={styles.tag}>💺 Sillas movibles</span>}
                      {space.has_whiteboard && <span style={styles.tag}>📋 Pizarrón</span>}
                    </div>
                    <button onClick={() => handleReserve(space)} style={styles.reserveBtn}>
                      Reservar
                    </button>
                  </div>
                ))}
              </div>
            )}
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
  content: { padding: '32px', maxWidth: '1200px', margin: '0 auto' },
  form: {
    backgroundColor: 'white', padding: '24px',
    borderRadius: '12px', marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  row: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' },
  field: { flex: 1, minWidth: '200px' },
  label: { display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#333' },
  input: {
    width: '100%', padding: '10px', borderRadius: '6px',
    border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box'
  },
  resourcesSection: { marginBottom: '16px' },
  checkboxRow: { display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px' },
  checkbox: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' },
  searchBtn: {
    width: '100%', padding: '12px', backgroundColor: '#4f46e5',
    color: 'white', border: 'none', borderRadius: '6px',
    fontSize: '16px', cursor: 'pointer'
  },
  error: { color: '#e53e3e', padding: '10px', backgroundColor: '#fff5f5', borderRadius: '6px' },
  results: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  noResults: { color: '#666', textAlign: 'center', padding: '32px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' },
  card: { border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' },
  spaceName: { color: '#4f46e5', marginBottom: '8px' },
  amenities: { display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '12px 0' },
  tag: { backgroundColor: '#eef2ff', color: '#4f46e5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' },
  reserveBtn: {
    width: '100%', padding: '10px', backgroundColor: '#48bb78',
    color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '8px'
  }
};

export default SearchPage;
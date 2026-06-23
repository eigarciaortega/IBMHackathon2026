import { useState, useEffect } from 'react';
import { getSpaces, getAvailableSpaces } from '../services/api';
import BookingModal from '../components/BookingModal';

const SearchPage = ({ onGoToBookings }) => {
  const [spaces, setSpaces] = useState([]);
  const [filters, setFilters] = useState({ tipo: '', capacidad: '', hora_entrada: '', hora_salida: '' });
  const [loading, setLoading] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [busquedaPorHorario, setBusquedaPorHorario] = useState(false);

  const fetchSpaces = async (currentFilters) => {
    const f = currentFilters || filters;
    setLoading(true);
    try {
      let res;
      if (f.hora_entrada && f.hora_salida) {
        setBusquedaPorHorario(true);
        res = await getAvailableSpaces({
          hora_entrada: new Date(f.hora_entrada).toISOString(),
          hora_salida: new Date(f.hora_salida).toISOString(),
          tipo: f.tipo || undefined,
          capacidad: f.capacidad || undefined
        });
      } else {
        setBusquedaPorHorario(false);
        const params = {};
        if (f.tipo) params.tipo = f.tipo;
        if (f.capacidad) params.capacidad = f.capacidad;
        res = await getSpaces(params);
      }
      setSpaces(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiar = async () => {
    const reset = { tipo: '', capacidad: '', hora_entrada: '', hora_salida: '' };
    setFilters(reset);
    setBusquedaPorHorario(false);
    await fetchSpaces(reset);
  };

  useEffect(() => { fetchSpaces(); }, []);

  const hayFiltros = filters.hora_entrada || filters.hora_salida || filters.tipo || filters.capacidad;

  return (
    <div style={{ padding: '2rem', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-800)' }}>
          Buscar Espacios
        </h2>
        <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>
          Selecciona un horario para ver disponibilidad en tiempo real
        </p>
      </div>

      {/* Filtros */}
      <div style={{
        background: 'white', padding: '1.5rem', borderRadius: 'var(--radius)',
        marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--gray-200)'
      }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[
            { label: 'Fecha y hora de entrada', key: 'hora_entrada', type: 'datetime-local' },
            { label: 'Fecha y hora de salida', key: 'hora_salida', type: 'datetime-local' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                {label}
              </label>
              <input type={type} value={filters[key]}
                onChange={e => setFilters({ ...filters, [key]: e.target.value })}
                style={{
                  padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)',
                  border: '2px solid var(--gray-200)', fontSize: '0.9rem', outline: 'none'
                }} />
            </div>
          ))}

          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
              Tipo
            </label>
            <select value={filters.tipo} onChange={e => setFilters({ ...filters, tipo: e.target.value })}
              style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', border: '2px solid var(--gray-200)', fontSize: '0.9rem', background: 'white' }}>
              <option value="">Todos</option>
              <option value="SALA">Sala</option>
              <option value="DESK">Escritorio</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
              Capacidad mín.
            </label>
            <input type="number" min="1" value={filters.capacidad}
              onChange={e => setFilters({ ...filters, capacidad: e.target.value })}
              placeholder="Ej: 6"
              style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '2px solid var(--gray-200)', width: '100px', fontSize: '0.9rem' }} />
          </div>

          <button onClick={() => fetchSpaces()} style={{
            padding: '0.65rem 1.5rem',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: 'white', border: 'none', borderRadius: 'var(--radius-sm)',
            fontWeight: 700, fontSize: '0.9rem',
            boxShadow: '0 4px 12px rgba(124,58,237,0.3)'
          }}>
            🔍 Buscar
          </button>

          {hayFiltros && (
            <button onClick={handleLimpiar} style={{
              padding: '0.65rem 1rem', background: 'var(--gray-100)',
              border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
              fontWeight: 600, color: 'var(--gray-600)', fontSize: '0.9rem'
            }}>
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Banner disponibilidad */}
      {busquedaPorHorario && filters.hora_entrada && filters.hora_salida && (
        <div style={{
          background: 'var(--primary-light)', padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem',
          color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 600,
          border: '1px solid rgba(124,58,237,0.2)',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          ✅ Espacios disponibles del{' '}
          <strong>{new Date(filters.hora_entrada).toLocaleString('es-MX')}</strong>
          {' al '}
          <strong>{new Date(filters.hora_salida).toLocaleString('es-MX')}</strong>
        </div>
      )}

      {/* Resultados */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          Cargando espacios...
        </div>
      ) : spaces.length === 0 ? (
        <div style={{
          background: 'white', padding: '3rem', borderRadius: 'var(--radius)',
          textAlign: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-200)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
          <p style={{ color: 'var(--gray-600)', fontSize: '1rem' }}>No se encontraron espacios con esos filtros</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {spaces.map(space => (
            <SpaceCard key={space.id} space={space} onReservar={() => setSelectedSpace(space)} />
          ))}
        </div>
      )}

      {selectedSpace && (
        <BookingModal
          space={selectedSpace}
          initialHoraEntrada={filters.hora_entrada}
          initialHoraSalida={filters.hora_salida}
          onClose={() => setSelectedSpace(null)}
          onSuccess={() => { setSelectedSpace(null); fetchSpaces(); }}
          onGoToBookings={onGoToBookings}
        />
      )}
    </div>
  );
};

const SpaceCard = ({ space, onReservar }) => {
  const recursos = [
    { key: 'con_proyector', icon: '📽', label: 'Proyector' },
    { key: 'con_aire', icon: '❄️', label: 'Aire' },
    { key: 'con_pizarron', icon: '📋', label: 'Pizarrón' },
    { key: 'con_tv', icon: '📺', label: 'TV' },
  ].filter(r => space[r.key]);

  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius)',
      padding: '1.5rem', boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--gray-200)', transition: 'all 0.2s',
      display: 'flex', flexDirection: 'column', gap: '0.75rem'
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--gray-800)' }}>{space.nombre}</h3>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginTop: '0.2rem' }}>📍 {space.piso}</p>
        </div>
        <span style={{
          background: space.tipo === 'SALA' ? 'var(--primary-light)' : 'var(--accent-light)',
          color: space.tipo === 'SALA' ? 'var(--primary)' : 'var(--accent)',
          padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700
        }}>
          {space.tipo}
        </span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        background: 'var(--gray-50)', padding: '0.5rem 0.75rem',
        borderRadius: 'var(--radius-sm)'
      }}>
        <span style={{ fontSize: '1.1rem' }}>👥</span>
        <span style={{ fontWeight: 600, color: 'var(--gray-600)', fontSize: '0.9rem' }}>
          {space.capacidad} personas
        </span>
      </div>

      {recursos.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {recursos.map(r => (
            <span key={r.key} style={{
              background: 'var(--gray-100)', padding: '0.2rem 0.6rem',
              borderRadius: '20px', fontSize: '0.75rem', color: 'var(--gray-600)',
              display: 'flex', alignItems: 'center', gap: '0.3rem'
            }}>
              {r.icon} {r.label}
            </span>
          ))}
        </div>
      )}

      <button onClick={onReservar} style={{
        width: '100%', padding: '0.7rem',
        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
        color: 'white', border: 'none', borderRadius: 'var(--radius-sm)',
        fontWeight: 700, fontSize: '0.9rem', marginTop: 'auto',
        boxShadow: '0 4px 12px rgba(124,58,237,0.3)'
      }}>
        Reservar →
      </button>
    </div>
  );
};

export default SearchPage;
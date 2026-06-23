import { useState, useEffect } from 'react';
import { getMyBookings, cancelBooking } from '../services/api';

const MyBookingsPage = ({ onBack }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchBookings = async () => {
    try {
      const res = await getMyBookings();
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleCancel = async (id) => {
    if (!confirm('¿Cancelar esta reserva?')) return;
    try {
      await cancelBooking(id);
      setMessage('success');
      fetchBookings();
    } catch (err) {
      setMessage('error:' + (err.response?.data?.error || 'Error al cancelar'));
    }
  };

  const isFuture = (fecha) => new Date(fecha) > new Date();

  const filtered = bookings.filter(b => {
    if (filter === 'confirmed') return b.status === 'CONFIRMED';
    if (filter === 'cancelled') return b.status === 'CANCELLED';
    return true;
  });

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-800)' }}>Mis Reservas</h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Historial y gestión de tus reservas</p>
        </div>
        <button onClick={onBack} style={{
          padding: '0.5rem 1rem', background: 'white',
          border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
          fontWeight: 600, color: 'var(--gray-600)', fontSize: '0.875rem'
        }}>
          ← Buscar más espacios
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--primary)', bg: 'var(--primary-light)', icon: '📋' },
          { label: 'Confirmadas', value: stats.confirmed, color: 'var(--success)', bg: 'var(--success-light)', icon: '✅' },
          { label: 'Canceladas', value: stats.cancelled, color: 'var(--danger)', bg: 'var(--danger-light)', icon: '❌' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'white', padding: '1.25rem', borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-200)',
            display: 'flex', alignItems: 'center', gap: '1rem'
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: s.bg, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.4rem'
            }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'all', label: 'Todas' },
          { key: 'confirmed', label: '✅ Confirmadas' },
          { key: 'cancelled', label: '❌ Canceladas' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '0.5rem 1.25rem',
            background: filter === f.key ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'white',
            color: filter === f.key ? 'white' : 'var(--gray-600)',
            border: filter === f.key ? 'none' : '1px solid var(--gray-200)',
            borderRadius: '20px', fontWeight: 600, fontSize: '0.875rem',
            boxShadow: filter === f.key ? '0 4px 12px rgba(124,58,237,0.3)' : 'none'
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem',
          background: message === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
          color: message === 'success' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${message === 'success' ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}`,
          fontWeight: 600, fontSize: '0.9rem'
        }}>
          {message === 'success' ? '✅ Reserva cancelada exitosamente' : `⚠️ ${message.replace('error:', '')}`}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>⏳ Cargando...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: 'white', padding: '3rem', borderRadius: 'var(--radius)',
          textAlign: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-200)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📅</div>
          <p style={{ color: 'var(--gray-600)' }}>No tienes reservas en esta categoría</p>
          <button onClick={onBack} style={{
            marginTop: '1rem', padding: '0.65rem 1.5rem',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700
          }}>
            Buscar espacios
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(b => (
            <div key={b.id} style={{
              background: 'white', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-200)',
              borderLeft: `4px solid ${b.status === 'CONFIRMED' ? 'var(--primary)' : 'var(--gray-200)'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                  <h4 style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{b.espacio_nombre}</h4>
                  <span style={{
                    padding: '0.15rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                    background: b.tipo === 'SALA' ? 'var(--primary-light)' : 'var(--accent-light)',
                    color: b.tipo === 'SALA' ? 'var(--primary)' : 'var(--accent)'
                  }}>{b.tipo}</span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                  <span>📍 {b.piso}</span>
                  <span>📅 {new Date(b.hora_entrada).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>🕐 {new Date(b.hora_entrada).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} — {new Date(b.hora_salida).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>👥 {b.asistentes} asistentes</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <span style={{
                  padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                  background: b.status === 'CONFIRMED' ? 'var(--success-light)' : 'var(--gray-100)',
                  color: b.status === 'CONFIRMED' ? 'var(--success)' : 'var(--gray-400)'
                }}>
                  {b.status === 'CONFIRMED' ? '✅ Confirmada' : '❌ Cancelada'}
                </span>
                {b.status === 'CONFIRMED' && isFuture(b.hora_entrada) && (
                  <button onClick={() => handleCancel(b.id)} style={{
                    padding: '0.35rem 0.9rem', background: 'var(--danger-light)',
                    color: 'var(--danger)', border: '1px solid rgba(220,38,38,0.3)',
                    borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.8rem'
                  }}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
import { useState } from 'react';
import { createBooking } from '../services/api';

// Genera datetime-local string con formato correcto: "YYYY-MM-DDTHH:MM"
const toDateTimeLocal = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Fecha mínima = ahora (para el atributo min del input)
const getMinDateTime = () => toDateTimeLocal(new Date());

const BookingModal = ({ space, onClose, onSuccess, onGoToBookings, initialHoraEntrada, initialHoraSalida }) => {
  const [form, setForm] = useState({
    hora_entrada: initialHoraEntrada || '',
    hora_salida: initialHoraSalida || '',
    asistentes: 1
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const minDateTime = getMinDateTime();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createBooking({
        espacio_id: space.id,
        hora_entrada: new Date(form.hora_entrada).toISOString(),
        hora_salida: new Date(form.hora_salida).toISOString(),
        asistentes: parseInt(form.asistentes)
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la reserva');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '2rem',
        width: '100%', maxWidth: '460px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
      }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'var(--success-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', margin: '0 auto 1.25rem'
            }}>✅</div>
            <h3 style={{ color: 'var(--success)', fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.2rem' }}>
              ¡Reserva Confirmada!
            </h3>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              <strong>{space.nombre}</strong> ha sido reservada exitosamente.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={onSuccess} style={{
                flex: 1, padding: '0.75rem', background: 'var(--gray-100)',
                border: 'none', borderRadius: 'var(--radius-sm)',
                fontWeight: 600, color: 'var(--gray-600)'
              }}>
                Seguir buscando
              </button>
              <button onClick={onGoToBookings} style={{
                flex: 1, padding: '0.75rem',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700
              }}>
                Ver mis reservas
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--gray-800)', marginBottom: '0.25rem' }}>
                    Reservar espacio
                  </h3>
                  <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                    {space.nombre}
                  </p>
                </div>
                <button onClick={onClose} style={{
                  background: 'var(--gray-100)', border: 'none',
                  borderRadius: '8px', width: '32px', height: '32px',
                  fontSize: '1rem', color: 'var(--gray-400)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>✕</button>
              </div>

              <div style={{
                display: 'flex', gap: '1rem', marginTop: '0.75rem',
                padding: '0.75rem', background: 'var(--gray-50)',
                borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--gray-600)'
              }}>
                <span>📍 {space.piso}</span>
                <span>👥 Cap. {space.capacidad} personas</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Hora entrada */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                  Fecha y hora de entrada
                </label>
                <input
                  type="datetime-local"
                  required
                  min={minDateTime}
                  value={form.hora_entrada}
                  onChange={e => setForm({ ...form, hora_entrada: e.target.value })}
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
                    fontSize: '0.95rem', outline: 'none', fontFamily: 'Poppins, sans-serif',
                    color: form.hora_entrada ? 'var(--gray-800)' : 'var(--gray-400)',
                    background: 'white'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
                />
              </div>

              {/* Hora salida */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                  Fecha y hora de salida
                </label>
                <input
                  type="datetime-local"
                  required
                  min={form.hora_entrada || minDateTime}
                  value={form.hora_salida}
                  onChange={e => setForm({ ...form, hora_salida: e.target.value })}
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
                    fontSize: '0.95rem', outline: 'none', fontFamily: 'Poppins, sans-serif',
                    color: form.hora_salida ? 'var(--gray-800)' : 'var(--gray-400)',
                    background: 'white'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
                />
              </div>

              {/* Asistentes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                  Número de asistentes
                  <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}> (máx. {space.capacidad})</span>
                </label>
                <input
                  type="number" min="1" max={space.capacidad} required
                  value={form.asistentes}
                  onChange={e => setForm({ ...form, asistentes: e.target.value })}
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
                    fontSize: '0.95rem', outline: 'none', fontFamily: 'Poppins, sans-serif'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
                />
              </div>

              {error && (
                <div style={{
                  color: 'var(--danger)', background: 'var(--danger-light)',
                  padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500,
                  border: '1px solid rgba(220,38,38,0.2)'
                }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={onClose} style={{
                  flex: 1, padding: '0.75rem', background: 'var(--gray-100)',
                  border: 'none', borderRadius: 'var(--radius-sm)',
                  fontWeight: 600, color: 'var(--gray-600)'
                }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading} style={{
                  flex: 2, padding: '0.75rem',
                  background: loading ? 'var(--gray-200)' : 'linear-gradient(135deg, var(--primary), var(--accent))',
                  color: loading ? 'var(--gray-400)' : 'white',
                  border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700,
                  boxShadow: loading ? 'none' : '0 4px 12px rgba(124,58,237,0.3)'
                }}>
                  {loading ? 'Procesando...' : 'Confirmar Reserva →'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
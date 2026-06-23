import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/api';

const LoginPage = () => {
  const { saveLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login(email, contrasena);
      saveLogin(res.data.token, res.data.user);
    } catch {
      setError('Credenciales inválidas. Verifica tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1E1B4B 0%, #5B21B6 50%, #7C3AED 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(236,72,153,0.15)' }} />
      <div style={{ position: 'absolute', bottom: '-150px', left: '-100px', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(124,58,237,0.2)' }} />

      <div style={{ display: 'flex', width: '100%', maxWidth: '900px', gap: '2rem', alignItems: 'center', zIndex: 1 }}>
        {/* Left panel */}
        <div style={{ flex: 1, color: 'white', display: 'none' }} className="left-panel">
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.2 }}>
            Gestiona tu espacio<br />de trabajo 🚀
          </h1>
          <p style={{ opacity: 0.8, fontSize: '1rem', lineHeight: 1.6 }}>
            Reserva salas y escritorios en segundos. Sin conflictos, sin Excel, sin complicaciones.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'white', borderRadius: '20px', padding: '2.5rem',
          width: '100%', maxWidth: '420px', margin: '0 auto',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem', margin: '0 auto 1rem'
            }}>🏢</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-800)' }}>
              OfficeSpace
            </h2>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Corporativo Alpha — Inicia sesión
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-600)' }}>
                Correo electrónico
              </label>
              <input
                type="email" value={email} required
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@corporativoalpha.com"
                style={{
                  width: '100%', padding: '0.8rem 1rem',
                  border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
                  fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-600)' }}>
                Contraseña
              </label>
              <input
                type="password" value={contrasena} required
                onChange={e => setContrasena(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '0.8rem 1rem',
                  border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
                  fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
              />
            </div>

            {error && (
              <div style={{
                background: 'var(--danger-light)', color: 'var(--danger)',
                padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
                marginBottom: '1.25rem', fontSize: '0.875rem',
                border: '1px solid rgba(220,38,38,0.2)',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '0.9rem',
              background: loading ? 'var(--gray-200)' : 'linear-gradient(135deg, var(--primary), var(--accent))',
              color: loading ? 'var(--gray-400)' : 'white',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontSize: '1rem', fontWeight: 700,
              boxShadow: loading ? 'none' : '0 4px 15px rgba(124,58,237,0.4)',
            }}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión →'}
            </button>
          </form>

          {/* Credentials hint */}
          <div style={{
            marginTop: '1.5rem', padding: '1rem',
            background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(124,58,237,0.15)'
          }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>
              👤 Usuarios de prueba
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
              <strong>Admin:</strong> admin@corporativoalpha.com / Admin123
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>
              <strong>Colaborador:</strong> carlos.mendez@corporativoalpha.com / User123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
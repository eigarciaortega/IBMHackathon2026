import { useState } from 'react';
import { authService } from '../services/api';
import '../styles/Login.css';

function Login({ onLogin }) {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authService.login(correo, contrasena);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Sistema de Reservas</h1>
          <p>Corporativo Alpha</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="correo">Correo Electrónico</label>
            <input
              type="email"
              id="correo"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              placeholder="usuario@corporativoalpha.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              type="password"
              id="contrasena"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="login-footer">
          <h3>Usuarios de Prueba:</h3>
          <div className="test-users">
            <div className="test-user">
              <strong>Administrador:</strong>
              <p>admin@corporativoalpha.com / Admin123</p>
            </div>
            <div className="test-user">
              <strong>Colaborador:</strong>
              <p>carlos.mendez@corporativoalpha.com / User123</p>
            </div>
            <div className="test-user">
              <strong>Colaborador:</strong>
              <p>ana.torres@corporativoalpha.com / User123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

// Made with Bob

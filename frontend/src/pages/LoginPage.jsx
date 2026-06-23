// Pantalla de inicio de sesión (R8).
//
// Presenta un campo de usuario, un campo de contraseña y un botón para iniciar
// sesión (R8.1). Valida en cliente que ambos campos estén presentes antes de
// enviar, conservando lo ya ingresado (R8.2). Ante credenciales inválidas
// muestra un mensaje de error, permanece en la pantalla y conserva el valor del
// campo de usuario (R8.3). Tras un inicio de sesión exitoso, persiste la sesión
// mediante `useAuth().login` y redirige según el Rol (R8.4, R8.5):
//   - ADMINISTRADOR → /admin
//   - COLABORADOR   → /buscar

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/authApi';
import { useAuth } from '../auth/AuthContext';
import { homePathForRole } from '../auth/session';
import './LoginPage.css';

// Mensajes de retroalimentación de la pantalla (R8.2, R8.3).
const MSG_REQUIRED = 'El usuario y la contraseña son obligatorios.';
const MSG_INVALID_CREDENTIALS = 'El usuario o la contraseña son incorrectos.';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login: persistSession } = useAuth();

  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    // R8.2: impedir el envío con campos vacíos, conservando los datos ingresados.
    if (usuario.trim() === '' || password.trim() === '') {
      setErrorMessage(MSG_REQUIRED);
      return;
    }

    setErrorMessage('');
    setSubmitting(true);

    try {
      const { token, role } = await authApi.login({ usuario, password });

      // R8.4 / R8.5: persistir sesión y redirigir según el Rol.
      persistSession({ token, role });
      navigate(homePathForRole(role), { replace: true });
    } catch (err) {
      // R8.3: credenciales inválidas → mensaje claro, permanecer en login y
      // conservar el valor del campo de usuario. Para otros fallos (p. ej.
      // bloqueo por intentos 429 o error de red) mostramos el mensaje del error.
      if (err && err.status === 401) {
        setErrorMessage(MSG_INVALID_CREDENTIALS);
      } else {
        setErrorMessage((err && err.message) || MSG_INVALID_CREDENTIALS);
      }
      setSubmitting(false);
    }
  }

  return (
    <main className="page page--login">
      <h1>Iniciar sesión</h1>

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="login-form__field">
          <label htmlFor="usuario">Usuario</label>
          <input
            id="usuario"
            name="usuario"
            type="text"
            autoComplete="username"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="login-form__field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
        </div>

        {errorMessage && (
          <p className="login-form__error" role="alert">
            {errorMessage}
          </p>
        )}

        <button type="submit" className="login-form__submit" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}

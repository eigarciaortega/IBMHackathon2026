// Cabecera de la aplicación para las vistas protegidas.
//
// Muestra el título, la navegación según el Rol y un botón para cerrar sesión
// (disponible para ambos roles). Se renderiza dentro del Layout que envuelve las
// rutas protegidas, de modo que las pruebas que montan las pantallas de forma
// aislada no dependen de esta cabecera.

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/session';
import './AppHeader.css';

export default function AppHeader() {
  const { role, nombre, logout } = useAuth();
  const navigate = useNavigate();

  /** Cierra sesión y redirige al login. */
  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const esAdmin = role === ROLES.ADMINISTRADOR;

  return (
    <header className="app-header">
      <div className="app-header__brand">OfficeSpace</div>

      <nav className="app-header__nav" aria-label="Navegación principal">
        {esAdmin ? (
          <NavLink to="/admin" className="app-header__link">
            Administración
          </NavLink>
        ) : (
          <>
            <NavLink to="/buscar" className="app-header__link">
              Buscar
            </NavLink>
            <NavLink to="/salas" className="app-header__link">
              Salas
            </NavLink>
            <NavLink to="/mis-reservas" className="app-header__link">
              Mis reservas
            </NavLink>
          </>
        )}
      </nav>

      <div className="app-header__user">
        {nombre && <span className="app-header__nombre">{nombre}</span>}
        <button type="button" className="app-header__logout" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

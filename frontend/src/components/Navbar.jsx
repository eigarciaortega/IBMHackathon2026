import { NavLink, useNavigate } from "react-router-dom";
import { clearSession, getUser } from "../utils/authStorage";

export default function Navbar() {
  const navigate = useNavigate();
  const user = getUser();

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">OfficeSpace</div>

      <div className="nav-links">
        <NavLink
          to="/spaces"
          className={({ isActive }) => (isActive ? "active-link" : "")}
        >
          Buscar espacios
        </NavLink>

        <NavLink
          to="/bookings/my"
          className={({ isActive }) => (isActive ? "active-link" : "")}
        >
          {user?.role === "ADMINISTRADOR" ? "Todas las reservas" : "Mis reservas"}
        </NavLink>

        {user?.role === "ADMINISTRADOR" && (
          <NavLink
            to="/admin"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            Administración
          </NavLink>
        )}

        <span className="nav-user">{user?.email}</span>

        <button className="logout-button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
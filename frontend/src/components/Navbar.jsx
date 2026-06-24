import { Link, useNavigate } from "react-router-dom";
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
      <strong>OfficeSpace</strong>

      <div className="nav-links">
        <Link to="/spaces">Buscar espacios</Link>
        <Link to="/bookings/my">Mis reservas</Link>

        {user?.role === "ADMINISTRADOR" && (
          <Link to="/admin">Administración</Link>
        )}

        <span>{user?.email}</span>
        <button onClick={handleLogout}>Cerrar sesión</button>
      </div>
    </nav>
  );
}
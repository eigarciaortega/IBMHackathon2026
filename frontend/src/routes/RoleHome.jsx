// Redirección de la ruta raíz según el estado de sesión y el Rol.
//
// - Sin sesión → /login.
// - ADMINISTRADOR → /admin (Vista de administración) (R8.4).
// - COLABORADOR → /buscar (Panel de búsqueda) (R8.5).

import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { homePathForRole } from '../auth/session';

export default function RoleHome() {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={homePathForRole(role)} replace />;
}

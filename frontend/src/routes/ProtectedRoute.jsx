// Ruta protegida con control de acceso por Rol.
//
// - Si no hay sesión, redirige a /login (R2.1, endpoint protegido).
// - Si se especifican `allowedRoles` y el Rol del Usuario no está permitido,
//   redirige a la vista de inicio correspondiente a su Rol (R8.4, R8.5),
//   evitando que un COLABORADOR acceda a la Vista de administración y viceversa.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { homePathForRole } from '../auth/session';

/**
 * @param {Object} props
 * @param {string[]} [props.allowedRoles] - Roles autorizados para la ruta.
 * @param {React.ReactNode} props.children - Contenido protegido.
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  return children;
}

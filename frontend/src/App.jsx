// Definición de rutas de la SPA.
//
// Rutas públicas: /login.
// Rutas protegidas (requieren sesión): redirección por Rol.
//   - /admin            → ADMINISTRADOR (Vista de administración).
//   - /buscar           → COLABORADOR (Panel de búsqueda).
//   - /reservar         → COLABORADOR (Confirmación de reserva).
//   - /mis-reservas     → COLABORADOR (Mis Reservas).
// La raíz "/" redirige a la vista de inicio del Rol (o a /login sin sesión).

import { Routes, Route } from 'react-router-dom';
import { ROLES } from './auth/session';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleHome from './routes/RoleHome';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SearchPage from './pages/SearchPage';
import ConfirmReservationPage from './pages/ConfirmReservationPage';
import MyReservationsPage from './pages/MyReservationsPage';
import SalasPage from './pages/SalasPage';
import SalaDetallePage from './pages/SalaDetallePage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<RoleHome />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMINISTRADOR]}>
            <Layout>
              <AdminPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/buscar"
        element={
          <ProtectedRoute allowedRoles={[ROLES.COLABORADOR, ROLES.ADMINISTRADOR]}>
            <Layout>
              <SearchPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reservar"
        element={
          <ProtectedRoute allowedRoles={[ROLES.COLABORADOR, ROLES.ADMINISTRADOR]}>
            <Layout>
              <ConfirmReservationPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/mis-reservas"
        element={
          <ProtectedRoute allowedRoles={[ROLES.COLABORADOR, ROLES.ADMINISTRADOR]}>
            <Layout>
              <MyReservationsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/salas"
        element={
          <ProtectedRoute allowedRoles={[ROLES.COLABORADOR, ROLES.ADMINISTRADOR]}>
            <Layout>
              <SalasPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/salas/:id"
        element={
          <ProtectedRoute allowedRoles={[ROLES.COLABORADOR, ROLES.ADMINISTRADOR]}>
            <Layout>
              <SalaDetallePage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

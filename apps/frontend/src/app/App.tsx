import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AdminRoute, ProtectedRoute } from '../components/ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { ChangePasswordPage } from '../pages/ChangePasswordPage';
import { DashboardPage } from '../pages/DashboardPage';
import { SpacesPage } from '../pages/SpacesPage';
import { ReservePage } from '../pages/ReservePage';
import { MyBookingsPage } from '../pages/MyBookingsPage';
import { BookingsAdminPage } from '../pages/BookingsAdminPage';
import { UsersAdminPage } from '../pages/UsersAdminPage';
import { AuditAdminPage } from '../pages/AuditAdminPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { FaqPage } from '../pages/FaqPage';
import { ExportAdminPage } from '../pages/ExportAdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/spaces" element={<SpacesPage />} />
        <Route path="/spaces/:id/reserve" element={<ReservePage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/faq" element={<FaqPage />} />

        <Route
          path="/admin/bookings"
          element={
            <AdminRoute>
              <BookingsAdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <UsersAdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <AdminRoute>
              <AuditAdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/export"
          element={
            <AdminRoute>
              <ExportAdminPage />
            </AdminRoute>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

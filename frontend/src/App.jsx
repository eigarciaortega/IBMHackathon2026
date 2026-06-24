import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SearchSpacesPage from "./pages/SearchSpacesPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import AdminPage from "./pages/AdminPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/spaces"
        element={
          <ProtectedRoute>
            <SearchSpacesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bookings/my"
        element={
          <ProtectedRoute>
            <MyBookingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="ADMINISTRADOR">
            <AdminPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
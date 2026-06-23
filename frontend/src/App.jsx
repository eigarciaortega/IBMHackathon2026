import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import SearchSpaces from './pages/SearchSpaces';
import ConfirmBooking from './pages/ConfirmBooking';
import MyBookings from './pages/MyBookings';
import AdminDashboard from './pages/AdminDashboard';
import SpacesDashboard from './pages/SpacesDashboard';
import './App.css';

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem',
        color: '#1976d2'
      }}>
        Cargando...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/search" element={<SearchSpaces />} />
      <Route path="/confirm-booking" element={<ConfirmBooking />} />
      <Route path="/my-bookings" element={<MyBookings />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/spaces" element={<SpacesDashboard />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;

// Made with Bob

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/api';
import Login from './pages/Login';
import Search from './pages/Search';
import BookingConfirm from './pages/BookingConfirm';
import AdminDashboard from './pages/AdminDashboard';

function PrivateRoute({ children, adminOnly = false }) {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/search" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/search" 
          element={
            <PrivateRoute>
              <Search />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/booking/:spaceId" 
          element={
            <PrivateRoute>
              <BookingConfirm />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            <PrivateRoute adminOnly={true}>
              <AdminDashboard />
            </PrivateRoute>
          } 
        />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        <Route 
          path="*" 
          element={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-xl text-gray-600 mb-8">Página no encontrada</p>
                <a 
                  href="/search" 
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Volver al inicio
                </a>
              </div>
            </div>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;

// Made with Bob

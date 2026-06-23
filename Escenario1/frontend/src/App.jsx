import { useState, useEffect } from 'react';
import Login from './pages/Login';
import SearchRooms from './pages/SearchRooms';
import MyReservations from './pages/MyReservations';
import AdminPanel from './pages/AdminPanel';

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('login');

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // Redirect based on role
        if (parsedUser.role === 'Administrador') {
          setCurrentPage('admin');
        } else {
          setCurrentPage('search');
        }
      } catch (error) {
        // Invalid data, clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    // Redirect based on role
    if (userData.role === 'Administrador' || userData.role === 'ADMINISTRADOR') {
      setCurrentPage('admin');
    } else {
      setCurrentPage('search');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('login');
  };

  const handleNavigate = (page) => {
    if (page === 'logout') {
      handleLogout();
    } else {
      setCurrentPage(page);
    }
  };

  // Render current page
  if (!user || currentPage === 'login') {
    return <Login onLogin={handleLogin} />;
  }

  if (user.role === 'Administrador' || user.role === 'ADMINISTRADOR') {
    return <AdminPanel user={user} onNavigate={handleNavigate} />;
  }

  // Colaborador pages
  if (currentPage === 'reservations') {
    return <MyReservations user={user} onNavigate={handleNavigate} />;
  }

  return <SearchRooms user={user} onNavigate={handleNavigate} />;
}

export default App;

// Made with Bob

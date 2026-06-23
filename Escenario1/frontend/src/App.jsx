import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SearchPage from './pages/SearchPage';
import AdminPage from './pages/AdminPage';
import MyBookingsPage from './pages/MyBookingsPage';

const AppContent = () => {
  const { user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('search');

  if (!user) return <LoginPage />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <nav style={{
        background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)',
        padding: '0 2rem',
        height: '64px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(91,33,182,0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '10px',
            width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem'
          }}>🏢</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white', letterSpacing: '-0.5px' }}>
              OfficeSpace
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', marginTop: '-2px' }}>
              Corporativo Alpha
            </div>
          </div>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          {[
            { key: 'search', label: '🔍 Buscar', show: true },
            { key: 'mybookings', label: '📅 Mis Reservas', show: true },
            { key: 'admin', label: '⚙️ Admin', show: user.perfil === 'ADMINISTRADOR' },
          ].filter(i => i.show).map(item => (
            <button key={item.key} onClick={() => setCurrentPage(item.key)} style={{
              background: currentPage === item.key ? 'rgba(255,255,255,0.2)' : 'transparent',
              color: 'white',
              border: currentPage === item.key ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              fontWeight: currentPage === item.key ? 700 : 400,
              fontSize: '0.9rem',
            }}>
              {item.label}
            </button>
          ))}
        </div>

        {/* User info + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '0.3rem 0.8rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, color: 'white'
            }}>
              {user.nombre?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>{user.nombre}</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)' }}>{user.perfil}</div>
            </div>
          </div>
          <button onClick={logout} style={{
            background: 'rgba(236,72,153,0.2)',
            color: '#F9A8D4',
            border: '1px solid rgba(236,72,153,0.4)',
            padding: '0.4rem 0.9rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}>
            Salir
          </button>
        </div>
      </nav>

      <main>
        {currentPage === 'search' && <SearchPage onGoToBookings={() => setCurrentPage('mybookings')} />}
        {currentPage === 'mybookings' && <MyBookingsPage onBack={() => setCurrentPage('search')} />}
        {currentPage === 'admin' && <AdminPage />}
      </main>
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
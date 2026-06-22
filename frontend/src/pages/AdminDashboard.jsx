import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { spacesService, bookingsService, authService } from '../services/api';
import { 
  LayoutDashboard, Building2, Calendar, Users, DollarSign, 
  TrendingUp, ArrowLeft, CheckCircle, XCircle, Clock, Package
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpaces: 0,
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    totalRevenue: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const user = authService.getCurrentUser();

  useEffect(() => {
    if (!authService.isAuthenticated() || user?.role !== 'admin') {
      navigate('/login');
      return;
    }
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [spacesResponse, bookingsResponse] = await Promise.all([
        spacesService.getAll(),
        bookingsService.getAll()
      ]);

      const spacesData = spacesResponse.data || [];
      const bookingsData = bookingsResponse.data || [];

      const pendingCount = bookingsData.filter(b => b.status === 'pending').length;
      const confirmedCount = bookingsData.filter(b => b.status === 'confirmed').length;
      const totalRevenue = bookingsData
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);

      setStats({
        totalSpaces: spacesData.length,
        totalBookings: bookingsData.length,
        pendingBookings: pendingCount,
        confirmedBookings: confirmedCount,
        totalRevenue: totalRevenue
      });

      setRecentBookings(bookingsData.slice(0, 10));
      setSpaces(spacesData.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pendiente' },
      confirmed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Confirmada' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelada' },
      completed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Completada' }
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/search')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <span className="text-2xl mr-2">🐝</span>
              <span className="text-xl font-bold text-gray-900">BeeSpace Admin</span>
            </div>
            <span className="text-sm text-gray-600">Hola, {user?.name}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
          <p className="text-gray-600">Vista general del sistema BeeSpace</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Espacios</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.totalSpaces}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Reservas</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.totalBookings}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Pendientes</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingBookings}</p>
            <p className="text-xs text-gray-500 mt-1">Confirmadas: {stats.confirmedBookings}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Ingresos Totales</h3>
            <p className="text-3xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Reservas Recientes</h2>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>

            {recentBookings.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No hay reservas registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">Reserva #{booking.id}</p>
                        <p className="text-sm text-gray-600">{booking.user_name}</p>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Espacio ID: {booking.space_id}</p>
                      <p>Fecha: {formatDate(booking.start_time)}</p>
                      <p className="font-semibold text-gray-900">Total: ${parseFloat(booking.total_price).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Espacios Destacados</h2>
              <Building2 className="w-5 h-5 text-gray-400" />
            </div>

            {spaces.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No hay espacios registrados</p>
              </div>
            ) : (
              <div className="space-y-4">
                {spaces.map((space) => (
                  <div key={space.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start">
                      <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                        <span className="text-2xl">🏢</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{space.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{space.city}, {space.state}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="w-4 h-4 mr-1" />
                            {space.capacity}
                          </div>
                          <div className="flex items-center text-sm font-semibold text-gray-900">
                            <DollarSign className="w-4 h-4" />
                            {space.price_per_hour}/hr
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <LayoutDashboard className="w-6 h-6 text-yellow-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-900">Acciones Rápidas</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/search')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors text-left"
            >
              <Building2 className="w-8 h-8 text-yellow-600 mb-2" />
              <h3 className="font-semibold text-gray-900 mb-1">Ver Espacios</h3>
              <p className="text-sm text-gray-600">Explorar todos los espacios disponibles</p>
            </button>

            <button
              onClick={() => alert('Funcionalidad en desarrollo')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors text-left"
            >
              <Calendar className="w-8 h-8 text-yellow-600 mb-2" />
              <h3 className="font-semibold text-gray-900 mb-1">Gestionar Reservas</h3>
              <p className="text-sm text-gray-600">Ver y administrar todas las reservas</p>
            </button>

            <button
              onClick={() => alert('Funcionalidad en desarrollo')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors text-left"
            >
              <Users className="w-8 h-8 text-yellow-600 mb-2" />
              <h3 className="font-semibold text-gray-900 mb-1">Usuarios</h3>
              <p className="text-sm text-gray-600">Administrar usuarios del sistema</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob

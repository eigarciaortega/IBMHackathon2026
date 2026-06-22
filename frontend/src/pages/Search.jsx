import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { spacesService, authService } from '../services/api';
import { Search as SearchIcon, MapPin, Users, DollarSign, Star, LogOut, Calendar } from 'lucide-react';

export default function Search() {
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    capacity: '',
    priceMin: '',
    priceMax: ''
  });
  const user = authService.getCurrentUser();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadSpaces();
  }, []);

  const loadSpaces = async (searchFilters = {}) => {
    setLoading(true);
    setError('');
    try {
      const response = await spacesService.getAll(searchFilters);
      setSpaces(response.data || []);
    } catch (err) {
      setError('Error al cargar los espacios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const searchFilters = {};
    if (filters.city) searchFilters.city = filters.city;
    if (filters.capacity) searchFilters.capacity = parseInt(filters.capacity);
    if (filters.priceMin) searchFilters.priceMin = parseFloat(filters.priceMin);
    if (filters.priceMax) searchFilters.priceMax = parseFloat(filters.priceMax);
    loadSpaces(searchFilters);
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleBookSpace = (spaceId) => {
    navigate(`/booking/${spaceId}`);
  };

  const getSpaceTypeLabel = (type) => {
    const types = {
      office: 'Oficina',
      meeting_room: 'Sala de Reuniones',
      coworking: 'Coworking',
      event_space: 'Espacio para Eventos',
      private_office: 'Oficina Privada'
    };
    return types[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl mr-2">🐝</span>
              <span className="text-xl font-bold text-gray-900">BeeSpace</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Hola, {user?.name}</span>
              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                >
                  Panel Admin
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Encuentra tu espacio ideal</h1>
          <p className="text-gray-600">Busca y reserva espacios de trabajo en tu ciudad</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ciudad
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="city"
                    value={filters.city}
                    onChange={handleFilterChange}
                    placeholder="Ej: Ciudad de México"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Capacidad mínima
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name="capacity"
                    value={filters.capacity}
                    onChange={handleFilterChange}
                    placeholder="Personas"
                    min="1"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio mínimo
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name="priceMin"
                    value={filters.priceMin}
                    onChange={handleFilterChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio máximo
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name="priceMax"
                    value={filters.priceMax}
                    onChange={handleFilterChange}
                    placeholder="1000"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors"
              >
                <SearchIcon className="w-5 h-5 mr-2" />
                Buscar
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            <p className="mt-4 text-gray-600">Cargando espacios...</p>
          </div>
        ) : spaces.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <SearchIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No se encontraron espacios</h3>
            <p className="text-gray-600">Intenta ajustar tus filtros de búsqueda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spaces.map((space) => (
              <div key={space.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center">
                  <span className="text-6xl">🏢</span>
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{space.name}</h3>
                    <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                      {getSpaceTypeLabel(space.space_type)}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{space.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      {space.city}, {space.state}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      Capacidad: {space.capacity} personas
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="w-4 h-4 mr-2" />
                      ${space.price_per_hour}/hora
                    </div>
                    {space.avg_rating > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Star className="w-4 h-4 mr-2 fill-yellow-400 text-yellow-400" />
                        {parseFloat(space.avg_rating).toFixed(1)} ({space.review_count} reseñas)
                      </div>
                    )}
                  </div>

                  {space.amenities && space.amenities.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {space.amenities.slice(0, 3).map((amenity, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {amenity}
                          </span>
                        ))}
                        {space.amenities.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            +{space.amenities.length - 3} más
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleBookSpace(space.id)}
                    className="w-full flex items-center justify-center px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Reservar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob

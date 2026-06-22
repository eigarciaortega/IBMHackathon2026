import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { spacesService, bookingsService, authService } from '../services/api';
import { Calendar, Clock, Users, DollarSign, MapPin, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { format, addHours } from 'date-fns';
import { es } from 'date-fns/locale';

export default function BookingConfirm() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const user = authService.getCurrentUser();

  const [bookingData, setBookingData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    attendees: 1,
    purpose: '',
    special_requirements: ''
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadSpace();
  }, [spaceId]);

  const loadSpace = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await spacesService.getById(spaceId);
      setSpace(response.data);
    } catch (err) {
      setError('Error al cargar el espacio');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setBookingData({
      ...bookingData,
      [e.target.name]: e.target.value
    });
  };

  const calculateTotal = () => {
    if (!space) return 0;
    const [startHour] = bookingData.startTime.split(':').map(Number);
    const [endHour] = bookingData.endTime.split(':').map(Number);
    const hours = endHour - startHour;
    return hours * space.price_per_hour;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const startDateTime = new Date(`${bookingData.date}T${bookingData.startTime}:00`);
      const endDateTime = new Date(`${bookingData.date}T${bookingData.endTime}:00`);

      if (startDateTime >= endDateTime) {
        throw new Error('La hora de inicio debe ser anterior a la hora de fin');
      }

      if (startDateTime < new Date()) {
        throw new Error('No puedes reservar en el pasado');
      }

      if (bookingData.attendees > space.capacity) {
        throw new Error(`El número de asistentes no puede exceder la capacidad del espacio (${space.capacity})`);
      }

      const response = await bookingsService.create({
        space_id: parseInt(spaceId),
        user_id: user.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        attendees: parseInt(bookingData.attendees),
        purpose: bookingData.purpose,
        special_requirements: bookingData.special_requirements
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/search');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al crear la reserva');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          <p className="mt-4 text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Espacio no encontrado</h2>
          <button
            onClick={() => navigate('/search')}
            className="mt-4 px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg"
          >
            Volver a búsqueda
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Reserva Exitosa!</h2>
          <p className="text-gray-600 mb-6">
            Tu reserva ha sido creada exitosamente. Recibirás un correo de confirmación.
          </p>
          <p className="text-sm text-gray-500">Redirigiendo...</p>
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
              <span className="text-xl font-bold text-gray-900">BeeSpace</span>
            </div>
            <span className="text-sm text-gray-600">Hola, {user?.name}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Confirmar Reserva</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Detalles del Espacio</h2>
            
            <div className="h-48 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-6xl">🏢</span>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">{space.name}</h3>
            <p className="text-gray-600 mb-4">{space.description}</p>

            <div className="space-y-3">
              <div className="flex items-center text-gray-700">
                <MapPin className="w-5 h-5 mr-3 text-gray-400" />
                <span>{space.address}, {space.city}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Users className="w-5 h-5 mr-3 text-gray-400" />
                <span>Capacidad: {space.capacity} personas</span>
              </div>
              <div className="flex items-center text-gray-700">
                <DollarSign className="w-5 h-5 mr-3 text-gray-400" />
                <span>${space.price_per_hour}/hora</span>
              </div>
            </div>

            {space.amenities && space.amenities.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Amenidades:</h4>
                <div className="flex flex-wrap gap-2">
                  {space.amenities.map((amenity, index) => (
                    <span key={index} className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Información de la Reserva</h2>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    name="date"
                    value={bookingData.date}
                    onChange={handleChange}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de inicio
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="time"
                      name="startTime"
                      value={bookingData.startTime}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de fin
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="time"
                      name="endTime"
                      value={bookingData.endTime}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de asistentes
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name="attendees"
                    value={bookingData.attendees}
                    onChange={handleChange}
                    min="1"
                    max={space.capacity}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Máximo: {space.capacity} personas</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Propósito de la reserva
                </label>
                <input
                  type="text"
                  name="purpose"
                  value={bookingData.purpose}
                  onChange={handleChange}
                  placeholder="Ej: Reunión de equipo, Presentación de proyecto"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requerimientos especiales (opcional)
                </label>
                <textarea
                  name="special_requirements"
                  value={bookingData.special_requirements}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Ej: Necesito proyector, catering, etc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-gray-900">Total a pagar:</span>
                  <span className="text-2xl font-bold text-yellow-600">${calculateTotal().toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Duración: {bookingData.endTime && bookingData.startTime ? 
                    `${parseInt(bookingData.endTime.split(':')[0]) - parseInt(bookingData.startTime.split(':')[0])} horas` : 
                    '0 horas'}
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Procesando...' : 'Confirmar Reserva'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob

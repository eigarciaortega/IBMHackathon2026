const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Buscar espacios disponibles
router.get('/search', bookingController.searchAvailableSpaces);

// Mis reservas
router.get('/my-bookings', bookingController.getMyBookings);

// Crear nueva reserva
router.post('/', bookingController.createBooking);

// Obtener reserva específica
router.get('/:id', bookingController.getBookingById);

// Cancelar reserva
router.patch('/:id/cancel', bookingController.cancelBooking);

// Todas las reservas (admin puede ver filtros adicionales)
router.get('/', bookingController.getAllBookings);

// Estadísticas
router.get('/stats/summary', bookingController.getBookingStats);

module.exports = router;

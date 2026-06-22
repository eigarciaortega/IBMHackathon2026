const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookingsController');
const {
  createBookingValidation,
  updateBookingValidation,
  queryBookingsValidation
} = require('../validators/bookingValidator');

router.get('/', queryBookingsValidation, bookingsController.getAllBookings);

router.get('/:id', bookingsController.getBookingById);

router.post('/', createBookingValidation, bookingsController.createBooking);

router.put('/:id', updateBookingValidation, bookingsController.updateBooking);

router.post('/:id/cancel', bookingsController.cancelBooking);

router.get('/user/:userId/statistics', bookingsController.getUserStatistics);

module.exports = router;

// Made with Bob

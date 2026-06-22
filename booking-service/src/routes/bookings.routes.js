const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { validateCreateBooking } = require('../validators/booking.validator');
const {
  createBooking,
  getMyBookings,
  cancelBooking,
} = require('../controllers/bookings.controller');

const router = Router();

// All booking routes require authentication
router.use(authenticate);

router.get('/my', getMyBookings);
router.post('/', validateCreateBooking, createBooking);
router.delete('/:id', cancelBooking);

module.exports = router;

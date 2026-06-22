const bookingsService = require('../services/bookings.service');

const createBooking = async (req, res) => {
  const { space_id, start_time, end_time, attendees } = req.body;
  const user_id = req.user.id;

  try {
    const result = await bookingsService.createBooking({
      space_id,
      start_time,
      end_time,
      attendees,
      user_id,
    });

    if (result.error) {
      return res.status(result.status).json({
        error: result.error,
        message: result.message || undefined,
      });
    }

    return res.status(201).json(result.data);
  } catch (err) {
    console.error('[Bookings] Create error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await bookingsService.getMyBookings(req.user.id);
    return res.status(200).json(bookings);
  } catch (err) {
    console.error('[Bookings] GetMy error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const cancelBooking = async (req, res) => {
  const booking_id = parseInt(req.params.id);

  if (isNaN(booking_id)) {
    return res.status(400).json({ error: 'Invalid booking id' });
  }

  try {
    const result = await bookingsService.cancelBooking(
      booking_id,
      req.user.id,
      req.user.role
    );

    if (result.error) {
      return res.status(result.status).json({
        error: result.error,
        message: result.message || undefined,
      });
    }

    return res.status(200).json(result.data);
  } catch (err) {
    console.error('[Bookings] Cancel error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createBooking, getMyBookings, cancelBooking };

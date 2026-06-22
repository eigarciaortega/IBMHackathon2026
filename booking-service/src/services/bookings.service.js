const pool = require('../db/pool');

// Check if a space exists and is active, and return its capacity
const getActiveSpace = async (space_id) => {
  const result = await pool.query(
    'SELECT id, name, capacity FROM spaces WHERE id = $1 AND is_active = TRUE',
    [space_id]
  );
  return result.rows[0] || null;
};

// THE critical overlap detection query.
// Returns true if the requested slot conflicts with any active booking.
// Overlap condition: existing.start_time < new.end_time AND existing.end_time > new.start_time
// Consecutive bookings (e.g. 09:00-10:00 and 10:00-11:00) are NOT considered overlapping.
const hasOverlap = async (space_id, start_time, end_time) => {
  const result = await pool.query(
    `SELECT id FROM bookings
     WHERE space_id = $1
       AND status = 'ACTIVE'
       AND start_time < $3
       AND end_time   > $2`,
    [space_id, start_time, end_time]
  );
  return result.rows.length > 0;
};

const createBooking = async ({ space_id, start_time, end_time, attendees, user_id }) => {
  // Step 1: Verify space exists and is active
  const space = await getActiveSpace(space_id);
  if (!space) {
    return { error: 'SPACE_NOT_FOUND', status: 404 };
  }

  // Step 2: Validate attendees against space capacity
  if (Number(attendees) > space.capacity) {
    return {
      error: 'CAPACITY_EXCEEDED',
      status: 400,
      message: `Space capacity is ${space.capacity}, requested ${attendees} attendees`,
    };
  }

  // Step 3: Check for overlapping bookings
  const conflict = await hasOverlap(space_id, start_time, end_time);
  if (conflict) {
    return { error: 'BOOKING_CONFLICT', status: 409 };
  }

  // Step 4: Create the booking
  const result = await pool.query(
    `INSERT INTO bookings (space_id, user_id, start_time, end_time, attendees, status)
     VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
     RETURNING id, space_id, user_id, start_time, end_time, attendees, status, created_at`,
    [space_id, user_id, start_time, end_time, attendees]
  );

  return { data: result.rows[0] };
};

const getMyBookings = async (user_id) => {
  const result = await pool.query(
    `SELECT
       b.id,
       b.start_time,
       b.end_time,
       b.attendees,
       b.status,
       b.created_at,
       s.name  AS space_name,
       s.type  AS space_type,
       s.floor AS space_floor
     FROM bookings b
     JOIN spaces s ON s.id = b.space_id
     WHERE b.user_id = $1
     ORDER BY b.start_time DESC`,
    [user_id]
  );
  return result.rows;
};

const cancelBooking = async (booking_id, user_id, role) => {
  // First fetch the booking to validate ownership
  const result = await pool.query(
    'SELECT id, user_id, status, start_time FROM bookings WHERE id = $1',
    [booking_id]
  );

  const booking = result.rows[0];

  if (!booking) {
    return { error: 'NOT_FOUND', status: 404 };
  }

  // Collaborators can only cancel their own bookings
  if (role !== 'ADMIN' && booking.user_id !== user_id) {
    return { error: 'FORBIDDEN', status: 403 };
  }

  // Cannot cancel a booking that is already in the past
  if (new Date(booking.start_time) <= new Date()) {
    return { error: 'BOOKING_ALREADY_STARTED', status: 400, message: 'Cannot cancel a booking that has already started' };
  }

  if (booking.status === 'CANCELLED') {
    return { error: 'ALREADY_CANCELLED', status: 400, message: 'Booking is already cancelled' };
  }

  await pool.query(
    "UPDATE bookings SET status = 'CANCELLED' WHERE id = $1",
    [booking_id]
  );

  return { data: { message: 'Booking cancelled successfully' } };
};

module.exports = { createBooking, getMyBookings, cancelBooking };

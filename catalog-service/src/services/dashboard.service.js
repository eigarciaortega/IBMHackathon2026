const pool = require('../db/pool');

/**
 * Occupancy snapshot for the admin panel.
 *
 * "Occupied now" means the CURRENT moment falls inside an active booking
 * (start_time <= NOW < end_time). A reservation later today or for a future
 * day does NOT make a space occupied right now — it only appears in the
 * space's upcoming schedule.
 *
 * Returns, per space:
 *   - is_occupied_now : boolean, occupied at this exact moment
 *   - current_booking : who occupies it now (or null)
 *   - upcoming_count  : number of current + future active bookings
 *   - bookings        : full schedule (current + future) with who booked each
 */
const getTodayOccupancy = async () => {
  // Active spaces
  const spacesResult = await pool.query(
    `SELECT id, name, type, capacity, floor
       FROM spaces
      WHERE is_active = TRUE
      ORDER BY type, name`
  );

  // All current + future active bookings, with who made each one.
  // end_time > NOW() keeps only reservations that haven't finished yet.
  const bookingsResult = await pool.query(
    `SELECT
       b.id,
       b.space_id,
       b.start_time,
       b.end_time,
       b.attendees,
       u.full_name AS user_name,
       u.email     AS user_email,
       (NOW() >= b.start_time AND NOW() < b.end_time) AS is_active_now
     FROM bookings b
     JOIN users u ON u.id = b.user_id
     WHERE b.status = 'ACTIVE'
       AND b.end_time > NOW()
     ORDER BY b.start_time ASC`
  );

  // Group bookings by space
  const bySpace = new Map();
  for (const b of bookingsResult.rows) {
    if (!bySpace.has(b.space_id)) bySpace.set(b.space_id, []);
    bySpace.get(b.space_id).push(b);
  }

  const spaces = spacesResult.rows.map((s) => {
    const bookings = bySpace.get(s.id) ?? [];
    const current = bookings.find((b) => b.is_active_now) ?? null;

    return {
      ...s,
      upcoming_count: bookings.length,
      is_occupied_now: Boolean(current),
      current_booking: current
        ? {
            user_name: current.user_name,
            user_email: current.user_email,
            start_time: current.start_time,
            end_time: current.end_time,
          }
        : null,
      bookings: bookings.map((b) => ({
        id: b.id,
        start_time: b.start_time,
        end_time: b.end_time,
        attendees: b.attendees,
        user_name: b.user_name,
        user_email: b.user_email,
        is_active_now: b.is_active_now,
      })),
    };
  });

  const total = spaces.length;
  const occupied = spaces.filter((s) => s.is_occupied_now).length;
  const free = total - occupied;

  return {
    summary: { total, occupied, free },
    spaces,
  };
};

module.exports = { getTodayOccupancy };

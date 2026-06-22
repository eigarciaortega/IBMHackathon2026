const pool = require('../db/pool');

const getTodayOccupancy = async () => {
  // Today's date range in UTC
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Count of active bookings per space for today
  const bookingsResult = await pool.query(
    `SELECT
       s.id,
       s.name,
       s.type,
       s.capacity,
       s.floor,
       COUNT(b.id) AS booking_count,
       CASE
         WHEN COUNT(b.id) > 0 THEN TRUE
         ELSE FALSE
       END AS is_occupied_now
     FROM spaces s
     LEFT JOIN bookings b
       ON b.space_id    = s.id
       AND b.status     = 'ACTIVE'
       AND b.start_time < $2
       AND b.end_time   > $1
     WHERE s.is_active = TRUE
     GROUP BY s.id, s.name, s.type, s.capacity, s.floor
     ORDER BY s.type, s.name`,
    [todayStart.toISOString(), todayEnd.toISOString()]
  );

  // Summary stats
  const total   = bookingsResult.rows.length;
  const occupied = bookingsResult.rows.filter(r => r.is_occupied_now).length;
  const free     = total - occupied;

  return {
    summary: { total, occupied, free },
    spaces: bookingsResult.rows,
  };
};

module.exports = { getTodayOccupancy };

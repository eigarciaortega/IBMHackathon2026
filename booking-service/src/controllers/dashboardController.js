const db = require("../db");

const getTodayDashboard = async (req, res) => {
  try {
    const totals = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM spaces) AS total_spaces,
        COUNT(DISTINCT b.space_id) FILTER (WHERE b.status = 'ACTIVE')::int AS occupied_today,
        COUNT(*)::int AS total_bookings_today,
        COUNT(*) FILTER (WHERE b.status = 'ACTIVE')::int AS active_bookings_today,
        COUNT(*) FILTER (WHERE b.status = 'CANCELLED')::int AS cancelled_bookings_today
      FROM bookings b
      WHERE b.date = CURRENT_DATE
    `);

    const currentBookings = await db.query(`
      SELECT s.name AS space_name, u.full_name AS user_name, b.start_time, b.end_time
      FROM bookings b
      JOIN spaces s ON s.id = b.space_id
      JOIN users u ON u.id = b.user_id
      WHERE b.date = CURRENT_DATE
        AND b.status = 'ACTIVE'
        AND CURRENT_TIME >= b.start_time
        AND CURRENT_TIME < b.end_time
      ORDER BY b.start_time ASC
    `);

    const row = totals.rows[0];
    const totalSpaces = row.total_spaces || 0;
    const occupiedToday = row.occupied_today || 0;

    return res.json({
      totalSpaces,
      occupiedToday,
      availableToday: Math.max(totalSpaces - occupiedToday, 0),
      totalBookingsToday: row.total_bookings_today || 0,
      activeBookingsToday: row.active_bookings_today || 0,
      cancelledBookingsToday: row.cancelled_bookings_today || 0,
      currentBookings: currentBookings.rows.map((booking) => ({
        spaceName: booking.space_name,
        userName: booking.user_name,
        startTime: booking.start_time,
        endTime: booking.end_time
      }))
    });
  } catch (error) {
    console.error("Dashboard today error", error);
    return res.status(500).json({ message: "Error interno al consultar dashboard de hoy." });
  }
};

const getAnalyticsDashboard = async (req, res) => {
  try {
    const totalBookings = await db.query(`SELECT COUNT(*)::int AS total FROM bookings`);
    const mostBookedSpaces = await db.query(`
      SELECT s.name, COUNT(*)::int AS bookings
      FROM bookings b
      JOIN spaces s ON s.id = b.space_id
      GROUP BY s.name
      ORDER BY bookings DESC, s.name ASC
      LIMIT 5
    `);
    const peakHours = await db.query(`
      SELECT lpad(EXTRACT(HOUR FROM start_time)::text, 2, '0') || ':00' AS hour,
             COUNT(*)::int AS bookings
      FROM bookings
      GROUP BY hour
      ORDER BY bookings DESC, hour ASC
      LIMIT 5
    `);
    const bookingsByType = await db.query(`
      SELECT s.type, COUNT(*)::int AS bookings
      FROM bookings b
      JOIN spaces s ON s.id = b.space_id
      GROUP BY s.type
      ORDER BY s.type ASC
    `);
    const averageAttendees = await db.query(`
      SELECT COALESCE(ROUND(AVG(attendees)::numeric, 2), 0)::float AS average
      FROM bookings
    `);
    const assistantSearchesTotal = await db.query(`
      SELECT COUNT(*)::int AS total
      FROM assistant_logs
    `);
    const mostRequestedResources = await db.query(`
      SELECT resource, COUNT(*)::int AS searches
      FROM assistant_logs, unnest(detected_resources) AS resource
      GROUP BY resource
      ORDER BY searches DESC, resource ASC
      LIMIT 5
    `);
    const mostRequestedType = await db.query(`
      SELECT detected_type AS type, COUNT(*)::int AS searches
      FROM assistant_logs
      WHERE detected_type IS NOT NULL
      GROUP BY detected_type
      ORDER BY searches DESC, detected_type ASC
      LIMIT 5
    `);
    const recentAssistantSearches = await db.query(`
      SELECT
        id,
        query_text,
        intent,
        detected_type,
        detected_capacity,
        detected_date,
        detected_time_preference,
        detected_resources,
        created_at
      FROM assistant_logs
      ORDER BY created_at DESC
      LIMIT 5
    `);

    return res.json({
      totalBookings: totalBookings.rows[0].total,
      mostBookedSpaces: mostBookedSpaces.rows,
      peakHours: peakHours.rows,
      bookingsByType: bookingsByType.rows,
      averageAttendees: averageAttendees.rows[0].average,
      assistantSearchesTotal: assistantSearchesTotal.rows[0].total,
      mostRequestedResources: mostRequestedResources.rows,
      mostRequestedType: mostRequestedType.rows,
      recentAssistantSearches: recentAssistantSearches.rows.map((search) => ({
        id: search.id,
        queryText: search.query_text,
        intent: search.intent,
        detectedType: search.detected_type,
        detectedCapacity: search.detected_capacity,
        detectedDate: search.detected_date,
        detectedTimePreference: search.detected_time_preference,
        detectedResources: search.detected_resources,
        createdAt: search.created_at
      }))
    });
  } catch (error) {
    console.error("Dashboard analytics error", error);
    return res.status(500).json({ message: "Error interno al consultar analitica." });
  }
};

module.exports = {
  getAnalyticsDashboard,
  getTodayDashboard
};

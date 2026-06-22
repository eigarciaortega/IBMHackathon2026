const db = require("../db");
const {
  parseBooleanQuery,
  parsePositiveInteger,
  uuidPattern,
  validateInterval,
  validTypes
} = require("../utils/bookingValidation");

const booleanFilters = {
  projector: "s.has_projector",
  ac: "s.has_ac",
  screen: "s.has_screen",
  whiteboard: "s.has_whiteboard",
  quietZone: "s.is_quiet_zone"
};

const mapSpace = (row) => ({
  id: row.id,
  name: row.name,
  type: row.type,
  capacity: row.capacity,
  floor: row.floor,
  hasProjector: row.has_projector,
  hasAc: row.has_ac,
  hasScreen: row.has_screen,
  hasWhiteboard: row.has_whiteboard,
  isQuietZone: row.is_quiet_zone,
  description: row.description
});

const mapBooking = (row) => ({
  id: row.id,
  date: row.date,
  startTime: row.start_time,
  endTime: row.end_time,
  attendees: row.attendees,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  space: {
    id: row.space_id,
    name: row.space_name,
    type: row.space_type,
    floor: row.space_floor,
    capacity: row.space_capacity
  }
});

const buildSpaceFilters = (query, values) => {
  const filters = [];

  if (query.type) {
    const type = String(query.type).toUpperCase();

    if (!validTypes.has(type)) {
      return { error: "type debe ser SALA o DESK." };
    }

    values.push(type);
    filters.push(`s.type = $${values.length}`);
  }

  const capacityValue = query.attendees ?? query.minCapacity;

  if (capacityValue !== undefined) {
    const capacity = parsePositiveInteger(capacityValue);

    if (!capacity) {
      return { error: "attendees o minCapacity debe ser un entero mayor a 0." };
    }

    values.push(capacity);
    filters.push(`s.capacity >= $${values.length}`);
  }

  for (const [queryName, columnName] of Object.entries(booleanFilters)) {
    const parsed = parseBooleanQuery(query[queryName]);

    if (parsed === null) {
      return { error: `${queryName} debe ser true o false.` };
    }

    if (parsed !== undefined) {
      values.push(parsed);
      filters.push(`${columnName} = $${values.length}`);
    }
  }

  return { filters };
};

const getAvailability = async (req, res) => {
  const { date, startTime, endTime } = req.query;
  const intervalErrors = validateInterval({ date, startTime, endTime });

  if (intervalErrors.length) {
    return res.status(400).json({
      message: "Datos invalidos para consultar disponibilidad.",
      errors: intervalErrors
    });
  }

  const values = [date, startTime, endTime];
  const filterResult = buildSpaceFilters(req.query, values);

  if (filterResult.error) {
    return res.status(400).json({ message: filterResult.error });
  }

  const whereFilters = filterResult.filters.length ? `AND ${filterResult.filters.join(" AND ")}` : "";

  try {
    const result = await db.query(
      `SELECT s.id, s.name, s.type, s.capacity, s.floor, s.has_projector, s.has_ac,
              s.has_screen, s.has_whiteboard, s.is_quiet_zone, s.description
       FROM spaces s
       WHERE NOT EXISTS (
         SELECT 1
         FROM bookings b
         WHERE b.space_id = s.id
           AND b.status = 'ACTIVE'
           AND b.date = $1::date
           AND $2::time < b.end_time
           AND $3::time > b.start_time
       )
       ${whereFilters}
       ORDER BY s.capacity ASC, s.name ASC`,
      values
    );

    return res.json({
      date,
      startTime,
      endTime,
      spaces: result.rows.map(mapSpace)
    });
  } catch (error) {
    console.error("Availability error", error);
    return res.status(500).json({ message: "Error interno al consultar disponibilidad." });
  }
};

const createBooking = async (req, res) => {
  const { spaceId, date, startTime, endTime } = req.body;
  const attendees = parsePositiveInteger(req.body.attendees);
  const errors = [];

  if (!spaceId) errors.push("spaceId es requerido.");
  if (spaceId && !uuidPattern.test(spaceId)) errors.push("spaceId debe ser un UUID valido.");
  if (!attendees) errors.push("attendees debe ser un entero mayor a 0.");
  errors.push(...validateInterval({ date, startTime, endTime }));

  if (errors.length) {
    return res.status(400).json({
      message: "Datos invalidos para crear reserva.",
      errors
    });
  }

  try {
    const spaceResult = await db.query(
      `SELECT id, name, capacity
       FROM spaces
       WHERE id = $1
       LIMIT 1`,
      [spaceId]
    );

    if (spaceResult.rowCount === 0) {
      return res.status(404).json({ message: "Espacio no encontrado." });
    }

    const space = spaceResult.rows[0];

    if (attendees > space.capacity) {
      return res.status(400).json({
        message: "La cantidad de asistentes excede la capacidad del espacio."
      });
    }

    const conflictResult = await db.query(
      `SELECT id
       FROM bookings
       WHERE space_id = $1
         AND status = 'ACTIVE'
         AND date = $2::date
         AND $3::time < end_time
         AND $4::time > start_time
       LIMIT 1`,
      [spaceId, date, startTime, endTime]
    );

    if (conflictResult.rowCount > 0) {
      return res.status(409).json({
        message: "El espacio ya tiene una reserva activa que se solapa con ese horario."
      });
    }

    const insertResult = await db.query(
      `INSERT INTO bookings (space_id, user_id, date, start_time, end_time, attendees, status)
       VALUES ($1, $2, $3::date, $4::time, $5::time, $6, 'ACTIVE')
       RETURNING id, space_id, user_id, date, start_time, end_time, attendees, status, created_at, updated_at`,
      [spaceId, req.user.id, date, startTime, endTime, attendees]
    );

    return res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error("Create booking error", error);
    return res.status(500).json({ message: "Error interno al crear reserva." });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.id, b.space_id, b.date, b.start_time, b.end_time, b.attendees, b.status,
              b.created_at, b.updated_at, s.name AS space_name, s.type AS space_type,
              s.floor AS space_floor, s.capacity AS space_capacity
       FROM bookings b
       JOIN spaces s ON s.id = b.space_id
       WHERE b.user_id = $1
       ORDER BY b.date ASC, b.start_time ASC`,
      [req.user.id]
    );

    return res.json(result.rows.map(mapBooking));
  } catch (error) {
    console.error("My bookings error", error);
    return res.status(500).json({ message: "Error interno al consultar mis reservas." });
  }
};

const cancelBooking = async (req, res) => {
  if (!uuidPattern.test(req.params.id)) {
    return res.status(400).json({ message: "id debe ser un UUID valido." });
  }

  try {
    const result = await db.query(
      `SELECT b.id, b.user_id, b.status, b.date, b.start_time, b.end_time, s.name AS space_name
       FROM bookings b
       JOIN spaces s ON s.id = b.space_id
       WHERE b.id = $1
       LIMIT 1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Reserva no encontrada." });
    }

    const booking = result.rows[0];

    if (req.user.role !== "ADMINISTRADOR" && booking.user_id !== req.user.id) {
      return res.status(403).json({ message: "No tienes permiso para cancelar esta reserva." });
    }

    if (booking.status === "CANCELLED") {
      return res.status(400).json({ message: "La reserva ya esta cancelada." });
    }

    const futureResult = await db.query(
      `SELECT ($1::date + $2::time) > NOW() AS is_future`,
      [booking.date, booking.start_time]
    );

    if (!futureResult.rows[0].is_future) {
      return res.status(400).json({ message: "Solo se pueden cancelar reservas futuras." });
    }

    const updateResult = await db.query(
      `UPDATE bookings
       SET status = 'CANCELLED',
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, status, updated_at`,
      [req.params.id]
    );

    return res.json({
      message: "Reserva cancelada correctamente.",
      booking: updateResult.rows[0]
    });
  } catch (error) {
    console.error("Cancel booking error", error);
    return res.status(500).json({ message: "Error interno al cancelar reserva." });
  }
};

module.exports = {
  cancelBooking,
  createBooking,
  getAvailability,
  getMyBookings
};

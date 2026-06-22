const db = require("../db");
const {
  parseBooleanQuery,
  parsePositiveInteger,
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

const mapSpaceForAssistant = (space) => ({
  id: space.id,
  name: space.name,
  type: space.type,
  capacity: space.capacity,
  floor: space.floor,
  has_projector: space.hasProjector,
  has_ac: space.hasAc,
  has_screen: space.hasScreen,
  has_whiteboard: space.hasWhiteboard,
  is_quiet_zone: space.isQuietZone,
  description: space.description
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

const findAvailableSpaces = async (query) => {
  const { date, startTime, endTime } = query;
  const intervalErrors = validateInterval({ date, startTime, endTime });

  if (intervalErrors.length) {
    return {
      error: "Datos invalidos para consultar disponibilidad.",
      errors: intervalErrors
    };
  }

  const values = [date, startTime, endTime];
  const filterResult = buildSpaceFilters(query, values);

  if (filterResult.error) {
    return { error: filterResult.error };
  }

  const whereFilters = filterResult.filters.length ? `AND ${filterResult.filters.join(" AND ")}` : "";
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

  return {
    date,
    startTime,
    endTime,
    spaces: result.rows.map(mapSpace)
  };
};

module.exports = {
  findAvailableSpaces,
  mapSpace,
  mapSpaceForAssistant
};

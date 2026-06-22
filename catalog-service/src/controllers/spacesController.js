const db = require("../db");

const validTypes = new Set(["SALA", "DESK"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const booleanFilters = {
  projector: "has_projector",
  ac: "has_ac",
  screen: "has_screen",
  whiteboard: "has_whiteboard",
  quietZone: "is_quiet_zone"
};

const toBoolean = (value) => {
  if (value === undefined) return undefined;
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return null;
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
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const validateSpacePayload = (body) => {
  const errors = [];
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type = typeof body.type === "string" ? body.type.trim().toUpperCase() : "";
  const capacity = Number(body.capacity);
  const floor = typeof body.floor === "string" ? body.floor.trim() : "";

  if (!name) errors.push("name es requerido.");
  if (!type) errors.push("type es requerido.");
  if (type && !validTypes.has(type)) errors.push("type debe ser SALA o DESK.");
  if (!Number.isInteger(capacity) || capacity <= 0) errors.push("capacity debe ser un entero mayor a 0.");
  if (!floor) errors.push("floor es requerido.");

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      name,
      type,
      capacity,
      floor,
      hasProjector: Boolean(body.hasProjector),
      hasAc: Boolean(body.hasAc),
      hasScreen: Boolean(body.hasScreen),
      hasWhiteboard: Boolean(body.hasWhiteboard),
      isQuietZone: Boolean(body.isQuietZone),
      description: typeof body.description === "string" ? body.description.trim() : ""
    }
  };
};

const listSpaces = async (req, res) => {
  const filters = [];
  const values = [];

  try {
    if (req.query.type) {
      const type = String(req.query.type).toUpperCase();

      if (!validTypes.has(type)) {
        return res.status(400).json({ message: "type debe ser SALA o DESK." });
      }

      values.push(type);
      filters.push(`type = $${values.length}`);
    }

    if (req.query.minCapacity !== undefined) {
      const minCapacity = Number(req.query.minCapacity);

      if (!Number.isInteger(minCapacity) || minCapacity <= 0) {
        return res.status(400).json({ message: "minCapacity debe ser un entero mayor a 0." });
      }

      values.push(minCapacity);
      filters.push(`capacity >= $${values.length}`);
    }

    for (const [queryName, columnName] of Object.entries(booleanFilters)) {
      const parsed = toBoolean(req.query[queryName]);

      if (parsed === null) {
        return res.status(400).json({ message: `${queryName} debe ser true o false.` });
      }

      if (parsed !== undefined) {
        values.push(parsed);
        filters.push(`${columnName} = $${values.length}`);
      }
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await db.query(
      `SELECT id, name, type, capacity, floor, has_projector, has_ac, has_screen,
              has_whiteboard, is_quiet_zone, description, created_at, updated_at
       FROM spaces
       ${whereClause}
       ORDER BY created_at ASC`,
      values
    );

    return res.json(result.rows.map(mapSpace));
  } catch (error) {
    console.error("List spaces error", error);
    return res.status(500).json({ message: "Error interno al listar espacios." });
  }
};

const getSpaceById = async (req, res) => {
  if (!uuidPattern.test(req.params.id)) {
    return res.status(400).json({ message: "id debe ser un UUID valido." });
  }

  try {
    const result = await db.query(
      `SELECT id, name, type, capacity, floor, has_projector, has_ac, has_screen,
              has_whiteboard, is_quiet_zone, description, created_at, updated_at
       FROM spaces
       WHERE id = $1
       LIMIT 1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Espacio no encontrado." });
    }

    return res.json(mapSpace(result.rows[0]));
  } catch (error) {
    console.error("Get space error", error);
    return res.status(500).json({ message: "Error interno al obtener espacio." });
  }
};

const createSpace = async (req, res) => {
  const validation = validateSpacePayload(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      message: "Datos invalidos para crear espacio.",
      errors: validation.errors
    });
  }

  const space = validation.data;

  try {
    const result = await db.query(
      `INSERT INTO spaces (
         name, type, capacity, floor, has_projector, has_ac, has_screen,
         has_whiteboard, is_quiet_zone, description
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, type, capacity, floor, has_projector, has_ac, has_screen,
                 has_whiteboard, is_quiet_zone, description, created_at, updated_at`,
      [
        space.name,
        space.type,
        space.capacity,
        space.floor,
        space.hasProjector,
        space.hasAc,
        space.hasScreen,
        space.hasWhiteboard,
        space.isQuietZone,
        space.description
      ]
    );

    return res.status(201).json(mapSpace(result.rows[0]));
  } catch (error) {
    console.error("Create space error", error);
    return res.status(500).json({ message: "Error interno al crear espacio." });
  }
};

const updateSpace = async (req, res) => {
  if (!uuidPattern.test(req.params.id)) {
    return res.status(400).json({ message: "id debe ser un UUID valido." });
  }

  const validation = validateSpacePayload(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      message: "Datos invalidos para actualizar espacio.",
      errors: validation.errors
    });
  }

  const space = validation.data;

  try {
    const result = await db.query(
      `UPDATE spaces
       SET name = $1,
           type = $2,
           capacity = $3,
           floor = $4,
           has_projector = $5,
           has_ac = $6,
           has_screen = $7,
           has_whiteboard = $8,
           is_quiet_zone = $9,
           description = $10,
           updated_at = NOW()
       WHERE id = $11
       RETURNING id, name, type, capacity, floor, has_projector, has_ac, has_screen,
                 has_whiteboard, is_quiet_zone, description, created_at, updated_at`,
      [
        space.name,
        space.type,
        space.capacity,
        space.floor,
        space.hasProjector,
        space.hasAc,
        space.hasScreen,
        space.hasWhiteboard,
        space.isQuietZone,
        space.description,
        req.params.id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Espacio no encontrado." });
    }

    return res.json(mapSpace(result.rows[0]));
  } catch (error) {
    console.error("Update space error", error);
    return res.status(500).json({ message: "Error interno al actualizar espacio." });
  }
};

const deleteSpace = async (req, res) => {
  if (!uuidPattern.test(req.params.id)) {
    return res.status(400).json({ message: "id debe ser un UUID valido." });
  }

  try {
    const result = await db.query(
      `DELETE FROM spaces
       WHERE id = $1
       RETURNING id, name`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Espacio no encontrado." });
    }

    return res.json({
      message: "Espacio eliminado correctamente.",
      space: result.rows[0]
    });
  } catch (error) {
    console.error("Delete space error", error);
    return res.status(500).json({ message: "Error interno al eliminar espacio." });
  }
};

module.exports = {
  listSpaces,
  getSpaceById,
  createSpace,
  updateSpace,
  deleteSpace
};

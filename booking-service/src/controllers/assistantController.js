const db = require("../db");
const { findAvailableSpaces, mapSpaceForAssistant } = require("../services/availabilityService");

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const toIsoDate = (date) => date.toISOString().slice(0, 10);

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

const detectTimeRange = (text) => {
  if (text.includes("tarde")) {
    return { startTime: "13:00", endTime: "17:00", timePreference: "AFTERNOON" };
  }

  if (text.includes("manana")) {
    return { startTime: "09:00", endTime: "12:00", timePreference: "MORNING" };
  }

  if (text.includes("noche")) {
    return { startTime: "17:00", endTime: "19:00", timePreference: "EVENING" };
  }

  return { startTime: null, endTime: null, timePreference: null };
};

const interpretAssistantMessage = (message) => {
  const text = normalizeText(message);
  const numberMatch = text.match(/\b(\d+)\b/);
  const resources = [];
  const filters = {
    type: null,
    capacity: numberMatch ? Number(numberMatch[1]) : null,
    date: null,
    startTime: null,
    endTime: null,
    timePreference: null,
    resources
  };

  if (
    text.includes("sala") ||
    text.includes("junta") ||
    text.includes("reunion") ||
    text.includes("entrevista") ||
    text.includes("capacitacion") ||
    text.includes("conferencia")
  ) {
    filters.type = "SALA";
  }

  if (text.includes("desk") || text.includes("escritorio")) {
    filters.type = "DESK";
  }

  if (!filters.capacity && filters.type === "DESK" && text.includes("individual")) {
    filters.capacity = 1;
  }

  if (text.includes("hoy")) {
    filters.date = addDays(0);
  } else if (text.includes("manana")) {
    filters.date = addDays(1);
  }

  const timeRange = detectTimeRange(text);
  filters.startTime = timeRange.startTime;
  filters.endTime = timeRange.endTime;
  filters.timePreference = timeRange.timePreference;

  if (text.includes("proyector")) resources.push("projector");
  if (text.includes("pantalla")) resources.push("screen");
  if (text.includes("pizarra")) resources.push("whiteboard");
  if (text.includes("aire acondicionado") || text.includes(" ac ")) resources.push("ac");
  if (text.includes("silencioso") || text.includes("silenciosa")) resources.push("quietZone");

  return filters;
};

const getMissingFields = (filters) => {
  const missing = [];

  if (!filters.date) missing.push("date");
  if (!filters.startTime || !filters.endTime) missing.push("time");
  if (!filters.capacity) missing.push("capacity");

  return missing;
};

const buildMissingDataMessage = (missingFields) => {
  if (!missingFields.length) return null;

  const labels = {
    date: "la fecha",
    time: "el horario",
    capacity: "cuantas personas asistiran"
  };

  return `Puedo ayudarte, pero necesito saber ${missingFields.map((field) => labels[field]).join(", ")} para recomendarte espacios disponibles.`;
};

const saveAssistantLog = async ({ userId, queryText, intent, filters }) => {
  await db.query(
    `INSERT INTO assistant_logs (
       user_id,
       query_text,
       intent,
       detected_type,
       detected_capacity,
       detected_date,
       detected_time_preference,
       detected_resources
     )
     VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8::text[])`,
    [
      userId,
      queryText,
      intent,
      filters.type,
      filters.capacity,
      filters.date,
      filters.timePreference,
      filters.resources
    ]
  );
};

const searchAssistantSpaces = async (req, res) => {
  const message = req.body.message;

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      intent: "BUSCAR_ESPACIO",
      message: "Cuentame que espacio necesitas para poder ayudarte.",
      interpretedFilters: {},
      missingFields: [],
      suggestedSpaces: []
    });
  }

  try {
    const interpretedFilters = interpretAssistantMessage(message);
    const missingFields = getMissingFields(interpretedFilters);
    const missingMessage = buildMissingDataMessage(missingFields);

    if (missingMessage) {
      await saveAssistantLog({
        userId: req.user.id,
        queryText: message,
        intent: "BUSCAR_ESPACIO",
        filters: interpretedFilters
      });

      return res.json({
        intent: "BUSCAR_ESPACIO",
        message: missingMessage,
        interpretedFilters,
        missingFields,
        suggestedSpaces: []
      });
    }

    const availabilityQuery = {
      date: interpretedFilters.date,
      startTime: interpretedFilters.startTime,
      endTime: interpretedFilters.endTime,
      type: interpretedFilters.type,
      attendees: interpretedFilters.capacity
    };

    for (const resource of interpretedFilters.resources) {
      availabilityQuery[resource] = true;
    }

    const availability = await findAvailableSpaces(availabilityQuery);

    if (availability.error) {
      await saveAssistantLog({
        userId: req.user.id,
        queryText: message,
        intent: "BUSCAR_ESPACIO",
        filters: interpretedFilters
      });

      return res.status(400).json({
        intent: "BUSCAR_ESPACIO",
        message: availability.errors?.[0] || availability.error,
        interpretedFilters,
        missingFields: [],
        suggestedSpaces: []
      });
    }

    const suggestedSpaces = availability.spaces.map(mapSpaceForAssistant);

    await saveAssistantLog({
      userId: req.user.id,
      queryText: message,
      intent: "BUSCAR_ESPACIO",
      filters: interpretedFilters
    });

    return res.json({
      intent: "BUSCAR_ESPACIO",
      message: suggestedSpaces.length
        ? "Encontre espacios disponibles que podrian funcionar para ti."
        : "No encontre espacios disponibles con esas caracteristicas. Puedes intentar con otro horario, menor capacidad o quitar algun recurso.",
      interpretedFilters,
      missingFields: [],
      suggestedSpaces
    });
  } catch (error) {
    console.error("Assistant search error", error);
    return res.status(500).json({
      intent: "BUSCAR_ESPACIO",
      message: "Error interno al consultar sugerencias de Alpha Assistant.",
      interpretedFilters: {},
      missingFields: [],
      suggestedSpaces: []
    });
  }
};

module.exports = {
  searchAssistantSpaces
};

const validTypes = new Set(["SALA", "DESK"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const todayIso = () => new Date().toISOString().slice(0, 10);

const isPastDate = (date) => date < todayIso();

const isValidDate = (date) => {
  if (!datePattern.test(date || "")) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

const isValidTime = (time) => timePattern.test(time || "");

const isEndAfterStart = (startTime, endTime) => isValidTime(startTime) && isValidTime(endTime) && endTime > startTime;

const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseBooleanQuery = (value) => {
  if (value === undefined) return undefined;
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return null;
};

const validateInterval = ({ date, startTime, endTime }) => {
  const errors = [];

  if (!date) errors.push("date es requerido.");
  if (!startTime) errors.push("startTime es requerido.");
  if (!endTime) errors.push("endTime es requerido.");

  if (date && !isValidDate(date)) errors.push("date debe tener formato YYYY-MM-DD.");
  if (startTime && !isValidTime(startTime)) errors.push("startTime debe tener formato HH:mm.");
  if (endTime && !isValidTime(endTime)) errors.push("endTime debe tener formato HH:mm.");
  if (date && isValidDate(date) && isPastDate(date)) errors.push("date no puede estar en el pasado.");
  if (startTime && endTime && !isEndAfterStart(startTime, endTime)) {
    errors.push("endTime debe ser mayor que startTime.");
  }

  return errors;
};

module.exports = {
  isEndAfterStart,
  parseBooleanQuery,
  parsePositiveInteger,
  todayIso,
  uuidPattern,
  validateInterval,
  validTypes
};

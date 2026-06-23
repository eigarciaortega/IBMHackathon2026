const service = "processor-service";

function logEvent(level, event, details = {}) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service,
      event,
      ...details
    })
  );
}

function sendError(response, statusCode, error, message) {
  logEvent(statusCode >= 500 ? "ERROR" : "WARN", statusCode >= 500 ? "internal_error" : "validation_error", {
    error,
    statusCode
  });

  return response.status(statusCode).json({
    error,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    service
  });
}

module.exports = {
  logEvent,
  sendError
};


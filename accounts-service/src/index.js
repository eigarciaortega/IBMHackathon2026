const express = require("express");
const swaggerUi = require("swagger-ui-express");
const { checkDatabase } = require("./db");
const accountsRoutes = require("./routes/accountsRoutes");
const { logEvent, sendError } = require("./utils/http");
const swaggerDocument = require("./swagger");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/health", async (_request, response) => {
  try {
    await checkDatabase();
    response.status(200).json({
      status: "ok",
      service: "accounts-service",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logEvent("ERROR", "internal_error", { message: error.message });

    response.status(503).json({
      status: "error",
      service: "accounts-service",
      database: "unavailable",
      timestamp: new Date().toISOString()
    });
  }
});

app.use(accountsRoutes);

app.use((error, _request, response, _next) => {
  logEvent("ERROR", "internal_error", { message: error.message });
  return sendError(response, 500, "internal_server_error", "Unexpected error in accounts-service.");
});

app.listen(port, () => {
  logEvent("INFO", "service_started", { port });
});

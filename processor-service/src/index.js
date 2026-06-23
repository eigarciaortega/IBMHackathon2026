const express = require("express");
const swaggerUi = require("swagger-ui-express");
const { checkDatabase } = require("./db");
const processorRoutes = require("./routes/processorRoutes");
const { accountsServiceUrl, checkAccountsService } = require("./services/accountsClient");
const { logEvent, sendError } = require("./utils/http");
const swaggerDocument = require("./swagger");

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/health", async (_request, response) => {
  try {
    await checkDatabase();
    const accountsReachable = await checkAccountsService();

    if (!accountsReachable) {
      return response.status(503).json({
        status: "error",
        service: "processor-service",
        database: "connected",
        accountsService: "unreachable",
        timestamp: new Date().toISOString()
      });
    }

    response.status(200).json({
      status: "ok",
      service: "processor-service",
      database: "connected",
      accountsService: "reachable",
      accounts_service_url: accountsServiceUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logEvent("ERROR", "internal_error", { message: error.message });

    response.status(503).json({
      status: "error",
      service: "processor-service",
      database: "unavailable",
      timestamp: new Date().toISOString()
    });
  }
});

app.use(processorRoutes);

app.use((error, _request, response, _next) => {
  logEvent("ERROR", "internal_error", { message: error.message });
  return sendError(response, 500, "internal_server_error", "Unexpected error in processor-service.");
});

app.listen(port, () => {
  logEvent("INFO", "service_started", { port });
});

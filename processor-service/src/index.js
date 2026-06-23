const express = require("express");
const swaggerUi = require("swagger-ui-express");
const { checkDatabase } = require("./db");
const processorRoutes = require("./routes/processorRoutes");
const { accountsServiceUrl } = require("./services/accountsClient");
const swaggerDocument = require("./swagger");

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/health", async (_request, response) => {
  try {
    await checkDatabase();
    response.status(200).json({
      status: "ok",
      service: "processor-service",
      database: "connected",
      accounts_service_url: accountsServiceUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "processor-service",
        message: error.message,
        timestamp: new Date().toISOString()
      })
    );

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
  console.error(
    JSON.stringify({
      level: "error",
      service: "processor-service",
      message: error.message,
      timestamp: new Date().toISOString()
    })
  );

  response.status(500).json({
    error: "internal_server_error",
    message: "Unexpected error in processor-service."
  });
});

app.listen(port, () => {
  console.log(
    JSON.stringify({
      level: "info",
      service: "processor-service",
      message: `Listening on port ${port}`,
      timestamp: new Date().toISOString()
    })
  );
});

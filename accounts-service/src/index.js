const express = require("express");
const swaggerUi = require("swagger-ui-express");
const { checkDatabase } = require("./db");
const accountsRoutes = require("./routes/accountsRoutes");
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
    console.error(
      JSON.stringify({
        level: "error",
        service: "accounts-service",
        message: error.message,
        timestamp: new Date().toISOString()
      })
    );

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
  console.error(
    JSON.stringify({
      level: "error",
      service: "accounts-service",
      message: error.message,
      timestamp: new Date().toISOString()
    })
  );

  response.status(500).json({
    error: "internal_server_error",
    message: "Unexpected error in accounts-service."
  });
});

app.listen(port, () => {
  console.log(
    JSON.stringify({
      level: "info",
      service: "accounts-service",
      message: `Listening on port ${port}`,
      timestamp: new Date().toISOString()
    })
  );
});

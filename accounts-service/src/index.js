const express = require("express");
const swaggerUi = require("swagger-ui-express");
const { pool, checkDatabase } = require("./db");
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
    response.status(503).json({
      status: "error",
      service: "accounts-service",
      database: "unavailable",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get("/accounts/:id", async (request, response, next) => {
  const userId = Number(request.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return response.status(400).json({
      error: "invalid_user_id",
      message: "User id must be a positive integer."
    });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, balance, created_at, updated_at FROM users WHERE id = $1",
      [userId]
    );

    if (result.rowCount === 0) {
      return response.status(404).json({
        error: "user_not_found",
        message: "Account was not found."
      });
    }

    return response.status(200).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/recharge", (_request, response) => {
  response.status(501).json({
    status: "not_implemented",
    phase: "1.1",
    message: "Simulated recharge business logic will be implemented in the next phase."
  });
});

app.post("/accounts/update-balance", (_request, response) => {
  response.status(501).json({
    status: "not_implemented",
    phase: "1.1",
    message: "Internal debit and credit operations will be implemented in the next phase."
  });
});

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


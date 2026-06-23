const express = require("express");
const swaggerUi = require("swagger-ui-express");
const { pool, checkDatabase } = require("./db");
const swaggerDocument = require("./swagger");

const app = express();
const port = Number(process.env.PORT || 3001);
const accountsServiceUrl = process.env.ACCOUNTS_SERVICE_URL || "http://localhost:3000";

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
    response.status(503).json({
      status: "error",
      service: "processor-service",
      database: "unavailable",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post("/api/transfer", (request, response) => {
  response.status(501).json({
    status: "not_implemented",
    phase: "1.1",
    idempotency_key_received: request.header("X-Idempotency-Key") || null,
    message: "P2P transfer, Saga compensation, and final idempotency logic will be implemented in the next phase."
  });
});

app.get("/api/transactions/:user_id", async (request, response, next) => {
  const userId = Number(request.params.user_id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return response.status(400).json({
      error: "invalid_user_id",
      message: "User id must be a positive integer."
    });
  }

  try {
    const result = await pool.query(
      `SELECT transaction_id, sender_id, receiver_id, amount, status, idempotency_key, error_message, created_at, updated_at
       FROM transactions
       WHERE sender_id = $1 OR receiver_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return response.status(200).json({
      user_id: userId,
      transactions: result.rows
    });
  } catch (error) {
    return next(error);
  }
});

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


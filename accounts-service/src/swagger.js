const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "NeoWallet Accounts Service API",
    version: "0.1.0",
    description: "Service for user balances, simulated recharges, and internal balance updates."
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local Docker environment"
    }
  ],
  paths: {
    "/health": {
      get: {
        summary: "Service health check",
        responses: {
          "200": {
            description: "Service and database are reachable"
          },
          "503": {
            description: "Database is not reachable"
          }
        }
      }
    },
    "/accounts/{id}": {
      get: {
        summary: "Get an account balance by user id",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
              minimum: 1
            }
          }
        ],
        responses: {
          "200": {
            description: "Account found"
          },
          "400": {
            description: "Invalid user id"
          },
          "404": {
            description: "Account not found"
          }
        }
      }
    },
    "/api/recharge": {
      post: {
        summary: "Simulated account recharge",
        description: "Phase 1.1 endpoint placeholder. Final business logic will be implemented later.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["user_id", "amount", "payment_method"],
                properties: {
                  user_id: { type: "integer", example: 1 },
                  amount: { type: "number", format: "decimal", example: 100.0 },
                  payment_method: { type: "string", example: "simulated_card" }
                }
              }
            }
          }
        },
        responses: {
          "501": {
            description: "Not implemented in phase 1.1"
          }
        }
      }
    },
    "/accounts/update-balance": {
      post: {
        summary: "Internal balance update endpoint",
        description: "Phase 1.1 endpoint placeholder for processor-service debit and credit operations.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["user_id", "amount", "operation"],
                properties: {
                  user_id: { type: "integer", example: 1 },
                  amount: { type: "number", format: "decimal", example: 25.5 },
                  operation: { type: "string", enum: ["debit", "credit"], example: "debit" }
                }
              }
            }
          }
        },
        responses: {
          "501": {
            description: "Not implemented in phase 1.1"
          }
        }
      }
    }
  }
};

module.exports = swaggerDocument;


const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "NeoWallet Processor Service API",
    version: "0.1.0",
    description: "Service for P2P transfer orchestration and transaction history."
  },
  servers: [
    {
      url: "http://localhost:3001",
      description: "Local Docker environment"
    }
  ],
  paths: {
    "/health": {
      get: {
        summary: "Service health check",
        responses: {
          "200": {
            description: "Service and processor database are reachable"
          },
          "503": {
            description: "Processor database is not reachable"
          }
        }
      }
    },
    "/api/transfer": {
      post: {
        summary: "Create a P2P transfer",
        description: "Phase 1.1 endpoint placeholder. Final transfer, Saga, and idempotency logic will be implemented later.",
        parameters: [
          {
            name: "X-Idempotency-Key",
            in: "header",
            required: false,
            schema: {
              type: "string"
            },
            description: "Future duplicate-processing protection key."
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["sender_id", "receiver_id", "amount"],
                properties: {
                  sender_id: { type: "integer", example: 1 },
                  receiver_id: { type: "integer", example: 2 },
                  amount: { type: "number", format: "decimal", example: 100.0 }
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
    "/api/transactions/{user_id}": {
      get: {
        summary: "Get transaction history for a user",
        parameters: [
          {
            name: "user_id",
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
            description: "Transaction list"
          },
          "400": {
            description: "Invalid user id"
          }
        }
      }
    }
  }
};

module.exports = swaggerDocument;


const errorResponse = {
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" }
  }
};

const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "NeoWallet Processor Service API",
    version: "0.3.0",
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
        description: "Transfers money from sender to receiver through accounts-service. The transaction is recorded as PENDING, DEBITED, then COMPLETED. X-Idempotency-Key is stored when provided, but full retry idempotency is planned for a later phase.",
        parameters: [
          {
            name: "X-Idempotency-Key",
            in: "header",
            required: false,
            schema: {
              type: "string"
            },
            example: "demo-transfer-001",
            description: "Optional key stored with the transaction for future duplicate-processing protection."
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
                  sender_id: { type: "integer", minimum: 1 },
                  receiver_id: { type: "integer", minimum: 1 },
                  amount: { type: "number", minimum: 0.01 }
                }
              },
              example: {
                sender_id: 1,
                receiver_id: 2,
                amount: 100.0
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Transfer completed successfully",
            content: {
              "application/json": {
                example: {
                  message: "Transfer completed successfully",
                  transaction_id: "9d87f3b3-1811-40c5-b3db-62f255a8407c",
                  sender_id: 1,
                  receiver_id: 2,
                  amount: "100.00",
                  status: "COMPLETED"
                }
              }
            }
          },
          "400": {
            description: "Invalid input, self-transfer, invalid amount, or insufficient funds",
            content: {
              "application/json": {
                schema: errorResponse,
                examples: {
                  selfTransfer: {
                    value: {
                      error: "self_transfer_not_allowed",
                      message: "sender_id and receiver_id must be different."
                    }
                  },
                  invalidAmount: {
                    value: {
                      error: "invalid_amount",
                      message: "amount is required, must be greater than 0, and can have up to 2 decimals."
                    }
                  },
                  insufficientFunds: {
                    value: {
                      error: "insufficient_funds",
                      message: "Sender does not have enough balance for this transfer."
                    }
                  }
                }
              }
            }
          },
          "404": {
            description: "Sender or receiver account not found",
            content: {
              "application/json": {
                schema: errorResponse,
                examples: {
                  senderNotFound: {
                    value: {
                      error: "sender_not_found",
                      message: "Sender account was not found."
                    }
                  },
                  receiverNotFound: {
                    value: {
                      error: "receiver_not_found",
                      message: "Receiver account was not found."
                    }
                  }
                }
              }
            }
          },
          "500": {
            description: "Internal server error"
          }
        }
      }
    },
    "/api/transactions/{user_id}": {
      get: {
        summary: "Get transaction history for a user",
        description: "Returns transactions where the user is sender or receiver, ordered by newest first. The type field is sent when user_id matches sender_id and received when user_id matches receiver_id.",
        parameters: [
          {
            name: "user_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
              minimum: 1
            },
            example: 1
          }
        ],
        responses: {
          "200": {
            description: "Transaction list",
            content: {
              "application/json": {
                example: {
                  user_id: 1,
                  transactions: [
                    {
                      transaction_id: "9d87f3b3-1811-40c5-b3db-62f255a8407c",
                      type: "sent",
                      sender_id: 1,
                      receiver_id: 2,
                      amount: "100.00",
                      status: "COMPLETED",
                      created_at: "2026-06-23T17:45:00.000Z"
                    }
                  ]
                }
              }
            }
          },
          "400": {
            description: "Invalid user id",
            content: {
              "application/json": {
                schema: errorResponse,
                example: {
                  error: "invalid_user_id",
                  message: "User id must be a positive integer."
                }
              }
            }
          },
          "404": {
            description: "Account not found",
            content: {
              "application/json": {
                schema: errorResponse,
                example: {
                  error: "user_not_found",
                  message: "Account was not found."
                }
              }
            }
          },
          "500": {
            description: "Internal server error"
          }
        }
      }
    }
  }
};

module.exports = swaggerDocument;


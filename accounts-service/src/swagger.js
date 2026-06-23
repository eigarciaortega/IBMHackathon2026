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
    title: "NeoWallet Accounts Service API",
    version: "0.2.0",
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
        description: "Returns account data without modifying balance. The id must be a positive integer.",
        parameters: [
          {
            name: "id",
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
            description: "Account found",
            content: {
              "application/json": {
                example: {
                  id: 1,
                  name: "Usuario A (Rico)",
                  email: "usuario.a@neowallet.com",
                  balance: "1000.00"
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
    },
    "/api/recharge": {
      post: {
        summary: "Simulated account recharge",
        description: "Adds funds to an account using an atomic SQL transaction. Amount must be positive and use at most 2 decimals.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["user_id", "amount"],
                properties: {
                  user_id: { type: "integer", minimum: 1 },
                  amount: { type: "number", minimum: 0.01 },
                  payment_method: { type: "string" }
                }
              },
              example: {
                user_id: 1,
                amount: 150.5,
                payment_method: "SIMULATED_CARD"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Recharge completed successfully",
            content: {
              "application/json": {
                example: {
                  message: "Recharge completed successfully",
                  user_id: 1,
                  previous_balance: "1000.00",
                  amount: "150.50",
                  new_balance: "1150.50",
                  payment_method: "SIMULATED_CARD"
                }
              }
            }
          },
          "400": {
            description: "Invalid input or amount",
            content: {
              "application/json": {
                schema: errorResponse,
                example: {
                  error: "invalid_amount",
                  message: "amount is required, must be greater than 0, and can have up to 2 decimals."
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
    },
    "/accounts/update-balance": {
      post: {
        summary: "Internal balance update endpoint",
        description: "Internal endpoint for processor-service. Supports atomic debit or credit with SELECT FOR UPDATE to reduce race conditions. Debit checks sufficient funds before updating.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["user_id", "amount", "operation"],
                properties: {
                  user_id: { type: "integer", minimum: 1 },
                  amount: { type: "number", minimum: 0.01 },
                  operation: { type: "string", enum: ["debit", "credit"] }
                }
              },
              example: {
                user_id: 1,
                amount: 100.0,
                operation: "debit"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Balance updated successfully",
            content: {
              "application/json": {
                example: {
                  message: "Balance updated successfully",
                  user_id: 1,
                  operation: "debit",
                  previous_balance: "1000.00",
                  amount: "100.00",
                  new_balance: "900.00"
                }
              }
            }
          },
          "400": {
            description: "Invalid input, invalid operation, or insufficient funds",
            content: {
              "application/json": {
                schema: errorResponse,
                examples: {
                  invalidOperation: {
                    value: {
                      error: "invalid_operation",
                      message: "operation must be debit or credit."
                    }
                  },
                  insufficientFunds: {
                    value: {
                      error: "insufficient_funds",
                      message: "The account does not have enough balance for this debit."
                    }
                  }
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

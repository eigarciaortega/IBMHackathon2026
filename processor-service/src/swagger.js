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
    version: "0.5.0",
    description: "Service for resilient P2P transfer orchestration, transaction history, idempotency, Saga compensation, and money conservation audit."
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
          "200": { description: "Service and processor database are reachable" },
          "503": { description: "Processor database is not reachable" }
        }
      }
    },
    "/api/transfer": {
      post: {
        summary: "Create a resilient P2P transfer",
        description: "Transfers money from sender to receiver through accounts-service. Supports X-Idempotency-Key replay protection and Saga-style compensation when credit fails after debit.",
        parameters: [
          {
            name: "X-Idempotency-Key",
            in: "header",
            required: false,
            schema: { type: "string" },
            example: "idem-001",
            description: "Optional key used to return the existing transaction without moving money again."
          },
          {
            name: "X-Simulate-Credit-Failure",
            in: "header",
            required: false,
            schema: { type: "string", enum: ["true"] },
            example: "true",
            description: "Development/demo-only header. Debits sender, simulates credit failure, compensates sender, and marks transaction ROLLED_BACK."
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
                  status: "COMPLETED",
                  idempotent_replay: false
                }
              }
            }
          },
          "200": {
            description: "Idempotent replay. Existing transaction returned and no money moved again.",
            content: {
              "application/json": {
                example: {
                  message: "Transfer completed successfully",
                  transaction_id: "9d87f3b3-1811-40c5-b3db-62f255a8407c",
                  sender_id: 1,
                  receiver_id: 2,
                  amount: "100.00",
                  status: "COMPLETED",
                  idempotent_replay: true
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
          "502": {
            description: "Credit failed after debit and compensation was executed",
            content: {
              "application/json": {
                example: {
                  error: "credit_failed_rolled_back",
                  message: "Credit failed after debit. Sender debit was compensated.",
                  transaction_id: "9d87f3b3-1811-40c5-b3db-62f255a8407c",
                  status: "ROLLED_BACK",
                  idempotent_replay: false
                }
              }
            }
          },
          "500": { description: "Internal server error" }
        }
      }
    },
    "/api/transactions/{user_id}": {
      get: {
        summary: "Get transaction history for a user",
        description: "Returns transactions where the user is sender or receiver, ordered by newest first. Shows COMPLETED, FAILED, and ROLLED_BACK records when present.",
        parameters: [
          {
            name: "user_id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
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
                    },
                    {
                      transaction_id: "2fb808f3-eafd-4e39-938c-182dc99fb7d0",
                      type: "sent",
                      sender_id: 1,
                      receiver_id: 2,
                      amount: "10.00",
                      status: "ROLLED_BACK",
                      created_at: "2026-06-23T17:46:00.000Z"
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
          "500": { description: "Internal server error" }
        }
      }
    },
    "/api/audit/money-conservation": {
      get: {
        summary: "Audit money conservation across seed accounts",
        description: "Demo/QA endpoint that sums balances for seed users 1, 2, and 3. The expected official seed total is 1050.00.",
        responses: {
          "200": {
            description: "Money conservation audit completed",
            content: {
              "application/json": {
                example: {
                  message: "Money conservation audit completed",
                  total_balance: "1050.00",
                  users_checked: 3,
                  expected_seed_total: "1050.00",
                  status: "CONSISTENT"
                }
              }
            }
          },
          "500": { description: "Internal server error" }
        }
      }
    },
    "/api/audit/reconciliation": {
      get: {
        summary: "Run a simple reconciliation report",
        description: "Counts transactions by status and verifies seed-account money conservation. This endpoint is read-only and does not repair data.",
        responses: {
          "200": {
            description: "Reconciliation report",
            content: {
              "application/json": {
                example: {
                  message: "Reconciliation completed",
                  money_conservation: {
                    total_balance: "1050.00",
                    expected_seed_total: "1050.00",
                    status: "CONSISTENT"
                  },
                  transactions: {
                    pending_count: 0,
                    debited_count: 0,
                    failed_count: 1,
                    rolled_back_count: 1,
                    completed_count: 2
                  },
                  warnings: [],
                  status: "OK"
                }
              }
            }
          },
          "500": { description: "Internal server error" }
        }
      }
    }
  }
};

module.exports = swaggerDocument;

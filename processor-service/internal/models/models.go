package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type Transaction struct {
	ID            int             `json:"id"`
	TransactionID uuid.UUID       `json:"transaction_id"`
	SenderID      int             `json:"sender_id"`
	ReceiverID    int             `json:"receiver_id"`
	Amount        decimal.Decimal `json:"amount"`
	Status        string          `json:"status"`
	ErrorMessage  string          `json:"error_message,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

type TransferRequest struct {
	SenderID       int             `json:"sender_id"`
	ReceiverID     int             `json:"receiver_id"`
	Amount         decimal.Decimal `json:"amount"`
	IdempotencyKey string          `json:"idempotency_key,omitempty"`
}

type TransferResponse struct {
	TransactionID uuid.UUID `json:"transaction_id"`
	Status        string    `json:"status"`
}

type TransactionHistoryItem struct {
	TransactionID uuid.UUID       `json:"transaction_id"`
	Tipo          string          `json:"tipo"`
	Counterparty  int             `json:"counterparty"`
	Amount        decimal.Decimal `json:"amount"`
	Status        string          `json:"status"`
	CreatedAt     time.Time       `json:"created_at"`
}

type UpdateBalanceRequest struct {
	UserID         int             `json:"user_id"`
	Amount         decimal.Decimal `json:"amount"`
	Operation      string          `json:"operation"`
	IdempotencyKey string          `json:"idempotency_key"`
}

type UpdateBalanceResponse struct {
	PreviousBalance decimal.Decimal `json:"previous_balance"`
	NewBalance      decimal.Decimal `json:"new_balance"`
}

type GetAccountResponse struct {
	ID      int             `json:"id"`
	Name    string          `json:"name"`
	Email   string          `json:"email"`
	Balance decimal.Decimal `json:"balance"`
}
package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type User struct {
	ID        int             `json:"id"`
	Name      string          `json:"name"`
	Email     string          `json:"email"`
	Balance   decimal.Decimal `json:"balance"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type BalanceOperation struct {
	ID              int             `json:"id"`
	IdempotencyKey  string          `json:"idempotency_key"`
	UserID          int             `json:"user_id"`
	Operation       string          `json:"operation"`
	Amount          decimal.Decimal `json:"amount"`
	PreviousBalance decimal.Decimal `json:"previous_balance"`
	NewBalance      decimal.Decimal `json:"new_balance"`
	CreatedAt       time.Time       `json:"created_at"`
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

type RechargeRequest struct {
	UserID        int             `json:"user_id"`
	Amount        decimal.Decimal `json:"amount"`
	PaymentMethod string          `json:"payment_method"`
}

type RechargeResponse struct {
	NewBalance decimal.Decimal `json:"new_balance"`
}
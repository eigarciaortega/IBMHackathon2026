package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	"github.com/i0dk1/NeoWallet/processor-service/internal/models"
)

type Repository struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) CreateTransaction(ctx context.Context, txID uuid.UUID, senderID, receiverID int, amount decimal.Decimal) (*models.Transaction, error) {
	var t models.Transaction
	err := r.pool.QueryRow(ctx,
		`INSERT INTO transactions (transaction_id, sender_id, receiver_id, amount, status)
		 VALUES ($1, $2, $3, $4, 'PENDING')
		 RETURNING id, transaction_id, sender_id, receiver_id, amount, status, created_at, updated_at`,
		txID, senderID, receiverID, amount,
	).Scan(&t.ID, &t.TransactionID, &t.SenderID, &t.ReceiverID, &t.Amount, &t.Status, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("error creando transacción: %w", err)
	}
	return &t, nil
}

func (r *Repository) UpdateStatus(ctx context.Context, txID uuid.UUID, status, errorMsg string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE transactions SET status = $1, error_message = $2, updated_at = now()
		 WHERE transaction_id = $3`,
		status, errorMsg, txID,
	)
	if err != nil {
		return fmt.Errorf("error actualizando estado de transacción: %w", err)
	}
	return nil
}

func (r *Repository) GetTransaction(ctx context.Context, txID uuid.UUID) (*models.Transaction, error) {
	var t models.Transaction
	var errMsg *string
	err := r.pool.QueryRow(ctx,
		`SELECT id, transaction_id, sender_id, receiver_id, amount, status, error_message, created_at, updated_at
		 FROM transactions WHERE transaction_id = $1`,
		txID,
	).Scan(&t.ID, &t.TransactionID, &t.SenderID, &t.ReceiverID, &t.Amount, &t.Status, &errMsg, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("error consultando transacción: %w", err)
	}
	if errMsg != nil {
		t.ErrorMessage = *errMsg
	}
	return &t, nil
}

func (r *Repository) GetTransactionsByUserID(ctx context.Context, userID int) ([]models.TransactionHistoryItem, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT transaction_id,
		        CASE WHEN sender_id = $1 THEN 'sent' ELSE 'received' END as tipo,
		        CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as counterparty,
		        amount, status, created_at
		 FROM transactions
		 WHERE (sender_id = $1 OR receiver_id = $1) AND status IN ('COMPLETED', 'ROLLED_BACK')
		 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("error consultando historial: %w", err)
	}
	defer rows.Close()

	var items []models.TransactionHistoryItem
	for rows.Next() {
		var item models.TransactionHistoryItem
		if err := rows.Scan(&item.TransactionID, &item.Tipo, &item.Counterparty, &item.Amount, &item.Status, &item.CreatedAt); err != nil {
			return nil, fmt.Errorf("error escaneando transacción: %w", err)
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *Repository) GetStuckTransactions(ctx context.Context, timeoutMinutes int) ([]models.Transaction, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, transaction_id, sender_id, receiver_id, amount, status,
		        COALESCE(error_message, '') as error_message, created_at, updated_at
		 FROM transactions
		 WHERE status IN ('PENDING', 'DEBITED')
		   AND updated_at < now() - make_interval(mins => $1)
		 ORDER BY created_at`,
		timeoutMinutes,
	)
	if err != nil {
		return nil, fmt.Errorf("error buscando transacciones atascadas: %w", err)
	}
	defer rows.Close()

	var txs []models.Transaction
	for rows.Next() {
		var t models.Transaction
		if err := rows.Scan(&t.ID, &t.TransactionID, &t.SenderID, &t.ReceiverID, &t.Amount, &t.Status, &t.ErrorMessage, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, fmt.Errorf("error escaneando transacción: %w", err)
		}
		txs = append(txs, t)
	}

	return txs, rows.Err()
}

func (r *Repository) Close() {
	r.pool.Close()
}
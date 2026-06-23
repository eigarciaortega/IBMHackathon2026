package repository

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	"github.com/mirto/neowallet/accounts-service/internal/models"
)

type Repository struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) GetUser(ctx context.Context, userID int) (*models.User, error) {
	var u models.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, email, balance, created_at, updated_at FROM users WHERE id = $1`,
		userID,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Balance, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error al consultar usuario: %w", err)
	}
	return &u, nil
}

func (r *Repository) GetBalanceOperation(ctx context.Context, idempotencyKey string) (*models.BalanceOperation, error) {
	var op models.BalanceOperation
	err := r.pool.QueryRow(ctx,
		`SELECT id, idempotency_key, user_id, operation, amount, previous_balance, new_balance, created_at
		 FROM balance_operations WHERE idempotency_key = $1`,
		idempotencyKey,
	).Scan(&op.ID, &op.IdempotencyKey, &op.UserID, &op.Operation, &op.Amount, &op.PreviousBalance, &op.NewBalance, &op.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error al consultar operación: %w", err)
	}
	return &op, nil
}

func (r *Repository) ApplyDebit(ctx context.Context, userID int, amount decimal.Decimal, idempotencyKey string) (*models.BalanceOperation, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("error al iniciar transacción de débito: %w", err)
	}
	defer tx.Rollback(ctx)

	existing, err := r.getBalanceOpInTx(ctx, tx, idempotencyKey)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		slog.Info("operación idempotente detectada (débito)", "idempotency_key", idempotencyKey)
		tx.Rollback(ctx)
		return existing, nil
	}

	var previousBalance, newBalance decimal.Decimal
	err = tx.QueryRow(ctx,
		`UPDATE users SET balance = balance - $1, updated_at = now()
		 WHERE id = $2 AND balance >= $1
		 RETURNING balance`,
		amount, userID,
	).Scan(&newBalance)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("fondos insuficientes o usuario no encontrado")
		}
		return nil, fmt.Errorf("error al debitar: %w", err)
	}

	var currentUser models.User
	err = tx.QueryRow(ctx,
		`SELECT balance FROM users WHERE id = $1`, userID,
	).Scan(&currentUser.Balance)
	if err != nil {
		return nil, fmt.Errorf("error al obtener saldo actual: %w", err)
	}
	previousBalance = currentUser.Balance.Add(amount)
	newBalance = currentUser.Balance

	op := &models.BalanceOperation{
		IdempotencyKey:  idempotencyKey,
		UserID:          userID,
		Operation:       "debit",
		Amount:          amount,
		PreviousBalance: previousBalance,
		NewBalance:      newBalance,
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO balance_operations (idempotency_key, user_id, operation, amount, previous_balance, new_balance)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		op.IdempotencyKey, op.UserID, op.Operation, op.Amount, op.PreviousBalance, op.NewBalance,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			existing, err2 := r.getBalanceOpInTx(ctx, tx, idempotencyKey)
			if err2 != nil {
				return nil, err2
			}
			if existing != nil {
				slog.Info("idempotencia detectada en inserción (débito)", "idempotency_key", idempotencyKey)
				tx.Rollback(ctx)
				return existing, nil
			}
		}
		return nil, fmt.Errorf("error al registrar operación de débito: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("error al confirmar débito: %w", err)
	}

	return op, nil
}

func (r *Repository) ApplyCredit(ctx context.Context, userID int, amount decimal.Decimal, idempotencyKey string) (*models.BalanceOperation, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("error al iniciar transacción de crédito: %w", err)
	}
	defer tx.Rollback(ctx)

	existing, err := r.getBalanceOpInTx(ctx, tx, idempotencyKey)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		slog.Info("operación idempotente detectada (crédito)", "idempotency_key", idempotencyKey)
		tx.Rollback(ctx)
		return existing, nil
	}

	var previousBalance, newBalance decimal.Decimal
	err = tx.QueryRow(ctx,
		`UPDATE users SET balance = balance + $1, updated_at = now()
		 WHERE id = $2
		 RETURNING balance`,
		amount, userID,
	).Scan(&newBalance)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("usuario no encontrado para crédito")
		}
		return nil, fmt.Errorf("error al acreditar: %w", err)
	}

	previousBalance = newBalance.Sub(amount)

	op := &models.BalanceOperation{
		IdempotencyKey:  idempotencyKey,
		UserID:          userID,
		Operation:       "credit",
		Amount:          amount,
		PreviousBalance: previousBalance,
		NewBalance:      newBalance,
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO balance_operations (idempotency_key, user_id, operation, amount, previous_balance, new_balance)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		op.IdempotencyKey, op.UserID, op.Operation, op.Amount, op.PreviousBalance, op.NewBalance,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			existing, err2 := r.getBalanceOpInTx(ctx, tx, idempotencyKey)
			if err2 != nil {
				return nil, err2
			}
			if existing != nil {
				slog.Info("idempotencia detectada en inserción (crédito)", "idempotency_key", idempotencyKey)
				tx.Rollback(ctx)
				return existing, nil
			}
		}
		return nil, fmt.Errorf("error al registrar operación de crédito: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("error al confirmar crédito: %w", err)
	}

	return op, nil
}

func (r *Repository) ApplyRecharge(ctx context.Context, userID int, amount decimal.Decimal, idempotencyKey string) (*models.BalanceOperation, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("error al iniciar transacción de recarga: %w", err)
	}
	defer tx.Rollback(ctx)

	existing, err := r.getBalanceOpInTx(ctx, tx, idempotencyKey)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		slog.Info("operación idempotente detectada (recarga)", "idempotency_key", idempotencyKey)
		tx.Rollback(ctx)
		return existing, nil
	}

	var previousBalance, newBalance decimal.Decimal
	err = tx.QueryRow(ctx,
		`UPDATE users SET balance = balance + $1, updated_at = now()
		 WHERE id = $2
		 RETURNING balance`,
		amount, userID,
	).Scan(&newBalance)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("usuario no encontrado para recarga")
		}
		return nil, fmt.Errorf("error al recargar: %w", err)
	}

	previousBalance = newBalance.Sub(amount)

	op := &models.BalanceOperation{
		IdempotencyKey:  idempotencyKey,
		UserID:          userID,
		Operation:       "recharge",
		Amount:          amount,
		PreviousBalance: previousBalance,
		NewBalance:      newBalance,
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO balance_operations (idempotency_key, user_id, operation, amount, previous_balance, new_balance)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		op.IdempotencyKey, op.UserID, op.Operation, op.Amount, op.PreviousBalance, op.NewBalance,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			existing, err2 := r.getBalanceOpInTx(ctx, tx, idempotencyKey)
			if err2 != nil {
				return nil, err2
			}
			if existing != nil {
				slog.Info("idempotencia detectada en inserción (recarga)", "idempotency_key", idempotencyKey)
				tx.Rollback(ctx)
				return existing, nil
			}
		}
		return nil, fmt.Errorf("error al registrar recarga: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("error al confirmar recarga: %w", err)
	}

	return op, nil
}

func (r *Repository) GetAllBalances(ctx context.Context) ([]models.User, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, email, balance, created_at, updated_at FROM users ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("error al consultar balances: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Balance, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, fmt.Errorf("error al escanear usuario: %w", err)
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *Repository) getBalanceOpInTx(ctx context.Context, tx pgx.Tx, idempotencyKey string) (*models.BalanceOperation, error) {
	var op models.BalanceOperation
	err := tx.QueryRow(ctx,
		`SELECT id, idempotency_key, user_id, operation, amount, previous_balance, new_balance, created_at
		 FROM balance_operations WHERE idempotency_key = $1`,
		idempotencyKey,
	).Scan(&op.ID, &op.IdempotencyKey, &op.UserID, &op.Operation, &op.Amount, &op.PreviousBalance, &op.NewBalance, &op.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error al verificar idempotencia: %w", err)
	}
	return &op, nil
}

func (r *Repository) Close() {
	r.pool.Close()
}
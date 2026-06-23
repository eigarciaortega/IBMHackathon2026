package services

import (
	"context"
	"crypto/rand"
	"fmt"
	"strings"

	"github.com/shopspring/decimal"

	"github.com/i0dk1/NeoWallet/accounts-service/internal/apperror"
	"github.com/i0dk1/NeoWallet/accounts-service/internal/models"
	"github.com/i0dk1/NeoWallet/accounts-service/internal/repository"
)

type AccountService struct {
	repo *repository.Repository
}

func New(repo *repository.Repository) *AccountService {
	return &AccountService{repo: repo}
}

func (s *AccountService) GetUser(ctx context.Context, userID int) (*models.User, error) {
	user, err := s.repo.GetUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("error obteniendo usuario: %w", err)
	}
	if user == nil {
		return nil, apperror.ErrUserNotFound
	}
	return user, nil
}

func (s *AccountService) Recharge(ctx context.Context, req models.RechargeRequest) (*models.RechargeResponse, error) {
	if err := validarMonto(req.Amount); err != nil {
		return nil, err
	}

	user, err := s.repo.GetUser(ctx, req.UserID)
	if err != nil {
		return nil, fmt.Errorf("error verificando usuario: %w", err)
	}
	if user == nil {
		return nil, apperror.ErrUserNotFound
	}

	idempotencyKey := generarIdempotencyKey("recharge", req.UserID)

	op, err := s.repo.ApplyRecharge(ctx, req.UserID, req.Amount, idempotencyKey)
	if err != nil {
		return nil, fmt.Errorf("error aplicando recarga: %w", err)
	}

	return &models.RechargeResponse{NewBalance: op.NewBalance}, nil
}

func (s *AccountService) UpdateBalance(ctx context.Context, req models.UpdateBalanceRequest) (*models.UpdateBalanceResponse, error) {
	if err := validarMonto(req.Amount); err != nil {
		return nil, err
	}

	user, err := s.repo.GetUser(ctx, req.UserID)
	if err != nil {
		return nil, fmt.Errorf("error verificando usuario: %w", err)
	}
	if user == nil {
		return nil, apperror.ErrUserNotFound
	}

	var op *models.BalanceOperation

	switch req.Operation {
	case "debit":
		op, err = s.repo.ApplyDebit(ctx, req.UserID, req.Amount, req.IdempotencyKey)
		if err != nil {
			if strings.Contains(err.Error(), "fondos insuficientes") {
				return nil, apperror.ErrInsufficientFunds
			}
			return nil, fmt.Errorf("error en débito: %w", err)
		}
	case "credit":
		op, err = s.repo.ApplyCredit(ctx, req.UserID, req.Amount, req.IdempotencyKey)
		if err != nil {
			return nil, fmt.Errorf("error en crédito: %w", err)
		}
	default:
		return nil, apperror.NewValidationError("operación inválida: debe ser 'debit' o 'credit'")
	}

	return &models.UpdateBalanceResponse{
		PreviousBalance: op.PreviousBalance,
		NewBalance:      op.NewBalance,
	}, nil
}

func (s *AccountService) GetAllBalances(ctx context.Context) ([]models.User, error) {
	return s.repo.GetAllBalances(ctx)
}

func validarMonto(amount decimal.Decimal) error {
	if amount.LessThanOrEqual(decimal.Zero) {
		return apperror.NewValidationError("el monto debe ser positivo")
	}
	str := amount.String()
	parts := strings.Split(str, ".")
	if len(parts) == 2 && len(parts[1]) > 2 {
		return apperror.NewValidationError("el monto debe tener como máximo dos decimales")
	}
	return nil
}

func generarIdempotencyKey(prefix string, userID int) string {
	b := make([]byte, 8)
	rand.Read(b)
	return fmt.Sprintf("%s:%d:%x", prefix, userID, b)
}
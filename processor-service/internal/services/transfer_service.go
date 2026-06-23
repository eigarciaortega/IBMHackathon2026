package services

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"github.com/i0dk1/NeoWallet/processor-service/internal/apperror"
	"github.com/i0dk1/NeoWallet/processor-service/internal/clients"
	"github.com/i0dk1/NeoWallet/processor-service/internal/models"
	"github.com/i0dk1/NeoWallet/processor-service/internal/repository"
)

type TransferService struct {
	repo          *repository.Repository
	accountsClient *clients.AccountsClient
}

func New(repo *repository.Repository, accountsClient *clients.AccountsClient) *TransferService {
	return &TransferService{
		repo:           repo,
		accountsClient: accountsClient,
	}
}

func (s *TransferService) Transfer(ctx context.Context, req models.TransferRequest) (*models.TransferResponse, error) {
	slog.Info("iniciando transferencia",
		"sender_id", req.SenderID,
		"receiver_id", req.ReceiverID,
		"amount", req.Amount.String(),
	)

	if req.SenderID == req.ReceiverID {
		return nil, apperror.ErrSelfTransferNotAllowed
	}

	if err := validarMonto(req.Amount); err != nil {
		return nil, err
	}

	// validar que sender existe y tiene fondos
	sender, err := s.accountsClient.GetUser(ctx, req.SenderID)
	if err != nil {
		slog.Error("error verificando remitente", "error", err)
		return nil, apperror.ErrInternal
	}
	if sender == nil {
		return nil, apperror.ErrUserNotFound
	}
	if sender.Balance.LessThan(req.Amount) {
		return nil, apperror.ErrInsufficientFunds
	}

	// validar que receiver existe
	receiver, err := s.accountsClient.GetUser(ctx, req.ReceiverID)
	if err != nil {
		slog.Error("error verificando destinatario", "error", err)
		return nil, apperror.ErrInternal
	}
	if receiver == nil {
		return nil, apperror.ErrUserNotFound
	}

	// generar transaction_id
	txID := uuid.New()

	// crear transacción en estado PENDING
	_, err = s.repo.CreateTransaction(ctx, txID, req.SenderID, req.ReceiverID, req.Amount)
	if err != nil {
		slog.Error("error creando transacción en DB", "error", err)
		return nil, apperror.ErrInternal
	}

	slog.Info("transacción creada", "transaction_id", txID.String(), "status", "PENDING")

	// PASO 1: Débito al remitente
	debitResp, err := s.accountsClient.UpdateBalance(ctx, models.UpdateBalanceRequest{
		UserID:         req.SenderID,
		Amount:         req.Amount,
		Operation:      "debit",
		IdempotencyKey: fmt.Sprintf("%s:debit", txID.String()),
	})
	if err != nil {
		if strings.Contains(err.Error(), "insufficient_funds") {
			s.repo.UpdateStatus(ctx, txID, "FAILED", "fondos insuficientes al momento del débito")
			return nil, apperror.ErrInsufficientFunds
		}
		slog.Error("error en débito", "error", err, "transaction_id", txID.String())
		s.repo.UpdateStatus(ctx, txID, "FAILED", fmt.Sprintf("error en débito: %v", err))
		return nil, apperror.ErrInternal
	}

	s.repo.UpdateStatus(ctx, txID, "DEBITED", "")
	slog.Info("débito exitoso", "transaction_id", txID.String(), "previo", debitResp.PreviousBalance.String(), "nuevo", debitResp.NewBalance.String())

	// PASO 2: Crédito al destinatario
	_, err = s.accountsClient.UpdateBalance(ctx, models.UpdateBalanceRequest{
		UserID:         req.ReceiverID,
		Amount:         req.Amount,
		Operation:      "credit",
		IdempotencyKey: fmt.Sprintf("%s:credit", txID.String()),
	})
	if err != nil {
		slog.Error("error en crédito, iniciando compensación", "error", err, "transaction_id", txID.String())

		// COMPENSACIÓN: devolver el monto al remitente
		_, compErr := s.accountsClient.UpdateBalance(ctx, models.UpdateBalanceRequest{
			UserID:         req.SenderID,
			Amount:         req.Amount,
			Operation:      "credit",
			IdempotencyKey: fmt.Sprintf("%s:compensate", txID.String()),
		})
		if compErr != nil {
			slog.Error("ERROR CRÍTICO: falló la compensación", "error", compErr, "transaction_id", txID.String())
			s.repo.UpdateStatus(ctx, txID, "FAILED", fmt.Sprintf("falló compensación: %v", compErr))
			return nil, apperror.ErrTransferFailed
		}

		s.repo.UpdateStatus(ctx, txID, "ROLLED_BACK", fmt.Sprintf("crédito falló: %v", err))
		slog.Warn("transferencia compensada (ROLLED_BACK)", "transaction_id", txID.String())
		return nil, apperror.ErrTransferFailed
	}

	s.repo.UpdateStatus(ctx, txID, "COMPLETED", "")
	slog.Info("transferencia completada", "transaction_id", txID.String(), "status", "COMPLETED")

	return &models.TransferResponse{
		TransactionID: txID,
		Status:        "COMPLETED",
	}, nil
}

func (s *TransferService) GetTransactionHistory(ctx context.Context, userID int) ([]models.TransactionHistoryItem, error) {
	// verificar que el usuario existe
	user, err := s.accountsClient.GetUser(ctx, userID)
	if err != nil {
		return nil, apperror.ErrInternal
	}
	if user == nil {
		return nil, apperror.ErrUserNotFound
	}

	return s.repo.GetTransactionsByUserID(ctx, userID)
}

func (s *TransferService) ReconcileStuckTransactions(ctx context.Context, timeoutMinutes int) {
	txs, err := s.repo.GetStuckTransactions(ctx, timeoutMinutes)
	if err != nil {
		slog.Error("error en reconciliación", "error", err)
		return
	}

	for _, tx := range txs {
		slog.Warn("transacción atascada detectada", "transaction_id", tx.TransactionID.String(), "status", tx.Status)

		switch tx.Status {
		case "PENDING":
			// nunca se debitaron fondos; simplemente marcar como fallida
			s.repo.UpdateStatus(ctx, tx.TransactionID, "FAILED", "transacción atascada en PENDING")
		case "DEBITED":
			// el dinero fue debitado pero no acreditado. Intentar acreditar al receiver
			_, err := s.accountsClient.UpdateBalance(ctx, models.UpdateBalanceRequest{
				UserID:         tx.ReceiverID,
				Amount:         tx.Amount,
				Operation:      "credit",
				IdempotencyKey: fmt.Sprintf("%s:credit", tx.TransactionID.String()),
			})
			if err != nil {
				// compensar al sender
				s.accountsClient.UpdateBalance(ctx, models.UpdateBalanceRequest{
					UserID:         tx.SenderID,
					Amount:         tx.Amount,
					Operation:      "credit",
					IdempotencyKey: fmt.Sprintf("%s:compensate", tx.TransactionID.String()),
				})
				s.repo.UpdateStatus(ctx, tx.TransactionID, "ROLLED_BACK", "compensado en reconciliación")
			} else {
				s.repo.UpdateStatus(ctx, tx.TransactionID, "COMPLETED", "completado en reconciliación")
			}
		}
	}
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
package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/i0dk1/NeoWallet/processor-service/internal/apperror"
	"github.com/i0dk1/NeoWallet/processor-service/internal/middleware"
	"github.com/i0dk1/NeoWallet/processor-service/internal/models"
	"github.com/i0dk1/NeoWallet/processor-service/internal/services"
)

type Handler struct {
	svc *services.TransferService
}

func New(svc *services.TransferService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	responderJSON(w, http.StatusOK, map[string]string{
		"status":   "ok",
		"servicio": "processor-service",
	})
}

// @Summary      Transferencia P2P
// @Description  Transfiere dinero de un usuario a otro usando Saga orquestada con compensación
// @Tags         transfers
// @Param        request body models.TransferRequest true "Datos de transferencia"
// @Success      200 {object} models.TransferResponse
// @Failure      400 {object} apperror.AppError
// @Failure      404 {object} apperror.AppError
// @Failure      500 {object} apperror.AppError
// @Router       /api/transfer [post]
func (h *Handler) Transfer(w http.ResponseWriter, r *http.Request) {
	txID := r.Context().Value(middleware.TransactionIDKey).(string)

	var req models.TransferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responderError(w, r, apperror.ErrBadRequest, txID)
		return
	}

	slog.Info("petición de transferencia",
		"sender_id", req.SenderID,
		"receiver_id", req.ReceiverID,
		"amount", req.Amount.String(),
		"transaction_id", txID,
	)

	resp, err := h.svc.Transfer(r.Context(), req)
	if err != nil {
		if appErr, ok := err.(*apperror.AppError); ok {
			responderError(w, r, appErr, txID)
			return
		}
		slog.Error("error en transferencia", "error", err, "transaction_id", txID)
		responderError(w, r, apperror.ErrInternal, txID)
		return
	}

	responderJSON(w, http.StatusOK, resp)
}

func (h *Handler) GetTransactions(w http.ResponseWriter, r *http.Request) {
	txID := r.Context().Value(middleware.TransactionIDKey).(string)

	userIDStr := chi.URLParam(r, "user_id")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil || userID <= 0 {
		responderError(w, r, apperror.ErrBadRequest, txID)
		return
	}

	history, err := h.svc.GetTransactionHistory(r.Context(), userID)
	if err != nil {
		if appErr, ok := err.(*apperror.AppError); ok {
			responderError(w, r, appErr, txID)
			return
		}
		slog.Error("error obteniendo historial", "error", err, "transaction_id", txID)
		responderError(w, r, apperror.ErrInternal, txID)
		return
	}

	responderJSON(w, http.StatusOK, history)
}

func responderJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func responderError(w http.ResponseWriter, r *http.Request, appErr *apperror.AppError, txID string) {
	appErr.TransactionID = txID
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(appErr.CodigoHTTP)
	json.NewEncoder(w).Encode(appErr)
}
package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/mirto/neowallet/accounts-service/internal/apperror"
	"github.com/mirto/neowallet/accounts-service/internal/middleware"
	"github.com/mirto/neowallet/accounts-service/internal/models"
	"github.com/mirto/neowallet/accounts-service/internal/services"
)

type Handler struct {
	svc *services.AccountService
}

func New(svc *services.AccountService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	responderJSON(w, http.StatusOK, map[string]string{
		"status":   "ok",
		"servicio": "accounts-service",
	})
}

// @Summary      Consultar saldo
// @Description  Obtiene los datos de un usuario incluyendo su saldo actual
// @Tags         accounts
// @Param        user_id path int true "ID del usuario"
// @Success      200 {object} models.User
// @Failure      400 {object} apperror.AppError
// @Failure      404 {object} apperror.AppError
// @Router       /accounts/{user_id} [get]
func (h *Handler) GetAccount(w http.ResponseWriter, r *http.Request) {
	txID := r.Context().Value(middleware.TransactionIDKey).(string)

	userIDStr := chi.URLParam(r, "user_id")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil || userID <= 0 {
		responderError(w, r, apperror.ErrBadRequest, txID)
		return
	}

	user, err := h.svc.GetUser(r.Context(), userID)
	if err != nil {
		if appErr, ok := err.(*apperror.AppError); ok {
			responderError(w, r, appErr, txID)
			return
		}
		slog.Error("error obteniendo usuario", "error", err, "transaction_id", txID)
		responderError(w, r, apperror.ErrInternal, txID)
		return
	}

	responderJSON(w, http.StatusOK, user)
}

// @Summary      Recargar saldo
// @Description  Incrementa el saldo de un usuario de forma atómica (simula recarga externa)
// @Tags         accounts
// @Param        request body models.RechargeRequest true "Datos de recarga"
// @Success      200 {object} models.RechargeResponse
// @Failure      400 {object} apperror.AppError
// @Failure      404 {object} apperror.AppError
// @Router       /api/recharge [post]
func (h *Handler) Recharge(w http.ResponseWriter, r *http.Request) {
	txID := r.Context().Value(middleware.TransactionIDKey).(string)

	var req models.RechargeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responderError(w, r, apperror.ErrBadRequest, txID)
		return
	}

	resp, err := h.svc.Recharge(r.Context(), req)
	if err != nil {
		if appErr, ok := err.(*apperror.AppError); ok {
			responderError(w, r, appErr, txID)
			return
		}
		slog.Error("error en recarga", "error", err, "transaction_id", txID)
		responderError(w, r, apperror.ErrInternal, txID)
		return
	}

	responderJSON(w, http.StatusOK, resp)
}

// @Summary      Actualizar balance (interno)
// @Description  Débito o crédito atómico con idempotencia. Requiere X-Internal-Key.
// @Tags         internal
// @Param        X-Internal-Key header string true "Clave secreta interna"
// @Param        request body models.UpdateBalanceRequest true "Datos de la operación"
// @Success      200 {object} models.UpdateBalanceResponse
// @Failure      400 {object} apperror.AppError
// @Failure      401 {object} apperror.AppError
// @Failure      404 {object} apperror.AppError
// @Router       /accounts/update-balance [post]
func (h *Handler) UpdateBalance(w http.ResponseWriter, r *http.Request) {
	txID := r.Context().Value(middleware.TransactionIDKey).(string)

	var req models.UpdateBalanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responderError(w, r, apperror.ErrBadRequest, txID)
		return
	}

	slog.Info("update-balance recibido",
		"user_id", req.UserID,
		"operation", req.Operation,
		"amount", req.Amount.String(),
		"idempotency_key", req.IdempotencyKey,
		"transaction_id", txID,
	)

	resp, err := h.svc.UpdateBalance(r.Context(), req)
	if err != nil {
		if appErr, ok := err.(*apperror.AppError); ok {
			responderError(w, r, appErr, txID)
			return
		}
		slog.Error("error en update-balance", "error", err, "transaction_id", txID)
		responderError(w, r, apperror.ErrInternal, txID)
		return
	}

	responderJSON(w, http.StatusOK, resp)
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
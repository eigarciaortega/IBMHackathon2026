package apperror

import "net/http"

type AppError struct {
	ErrorCode     string `json:"error"`
	Mensaje       string `json:"mensaje"`
	TransactionID string `json:"transaction_id,omitempty"`
	CodigoHTTP    int    `json:"-"`
}

func (e *AppError) Error() string {
	return e.Mensaje
}

var (
	ErrSelfTransferNotAllowed = &AppError{
		ErrorCode:  "self_transfer_not_allowed",
		Mensaje:    "El remitente y el destinatario no pueden ser el mismo usuario.",
		CodigoHTTP: http.StatusBadRequest,
	}

	ErrInvalidAmount = &AppError{
		ErrorCode:  "invalid_amount",
		Mensaje:    "El monto debe ser positivo y tener como máximo dos decimales.",
		CodigoHTTP: http.StatusBadRequest,
	}

	ErrUserNotFound = &AppError{
		ErrorCode:  "user_not_found",
		Mensaje:    "El usuario no existe.",
		CodigoHTTP: http.StatusNotFound,
	}

	ErrInsufficientFunds = &AppError{
		ErrorCode:  "insufficient_funds",
		Mensaje:    "El remitente no tiene saldo suficiente.",
		CodigoHTTP: http.StatusBadRequest,
	}

	ErrBadRequest = &AppError{
		ErrorCode:  "bad_request",
		Mensaje:    "Solicitud inválida.",
		CodigoHTTP: http.StatusBadRequest,
	}

	ErrInternal = &AppError{
		ErrorCode:  "internal_error",
		Mensaje:    "Error interno del servidor.",
		CodigoHTTP: http.StatusInternalServerError,
	}

	ErrUnauthorized = &AppError{
		ErrorCode:  "unauthorized",
		Mensaje:    "No autorizado.",
		CodigoHTTP: http.StatusUnauthorized,
	}
)

func NewValidationError(mensaje string) *AppError {
	return &AppError{
		ErrorCode:  "invalid_amount",
		Mensaje:    mensaje,
		CodigoHTTP: http.StatusBadRequest,
	}
}
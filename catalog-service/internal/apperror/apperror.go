// Package apperror define el sobre de error estándar y los códigos estables del
// catalog-service. La forma del error es idéntica en los tres microservicios.
package apperror

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
)

type sobre struct {
	Error cuerpo `json:"error"`
}

type cuerpo struct {
	Codigo  string `json:"codigo"`
	Mensaje string `json:"mensaje"`
}

// AppError es un error de dominio con código estable y status HTTP.
type AppError struct {
	Status  int
	Codigo  string
	Mensaje string
}

func (e *AppError) Error() string { return e.Codigo + ": " + e.Mensaje }

// Nuevo construye un AppError puntual (p. ej. mensajes de validación específicos).
func Nuevo(status int, codigo, mensaje string) *AppError {
	return &AppError{Status: status, Codigo: codigo, Mensaje: mensaje}
}

// Errores comunes del catalog-service.
var (
	ErrSolicitudInvalida   = &AppError{http.StatusBadRequest, "SOLICITUD_INVALIDA", "La solicitud no es válida."}
	ErrTokenAusente        = &AppError{http.StatusUnauthorized, "TOKEN_AUSENTE", "Falta el token de autenticación."}
	ErrTokenInvalido       = &AppError{http.StatusUnauthorized, "TOKEN_INVALIDO", "El token es inválido o expiró."}
	ErrAccesoDenegado      = &AppError{http.StatusForbidden, "ACCESO_DENEGADO", "No tienes permisos para esta acción."}
	ErrEspacioNoEncontrado = &AppError{http.StatusNotFound, "ESPACIO_NO_ENCONTRADO", "El espacio no existe."}
	ErrRecursoNoEncontrado = &AppError{http.StatusNotFound, "RECURSO_NO_ENCONTRADO", "El recurso no existe."}
	ErrRecursoDuplicado    = &AppError{http.StatusConflict, "RECURSO_DUPLICADO", "Ya existe un recurso con ese nombre."}
	ErrRecursoInvalido     = &AppError{http.StatusBadRequest, "RECURSO_INVALIDO", "Uno o más recursos asignados no existen."}
	ErrInterno             = &AppError{http.StatusInternalServerError, "ERROR_INTERNO", "Ocurrió un error interno."}
)

// Escribir serializa el error como el sobre estándar. Si no es un *AppError, se
// registra el detalle y se responde con un 500 genérico.
func Escribir(w http.ResponseWriter, err error) {
	var appErr *AppError
	if !errors.As(err, &appErr) {
		log.Printf("error no controlado: %v", err)
		appErr = ErrInterno
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(appErr.Status)
	_ = json.NewEncoder(w).Encode(sobre{Error: cuerpo{Codigo: appErr.Codigo, Mensaje: appErr.Mensaje}})
}

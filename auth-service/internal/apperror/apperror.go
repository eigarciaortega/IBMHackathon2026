// Package apperror define el sobre de error estándar y los códigos estables que
// comparte todo el servicio. La forma de la respuesta es idéntica en los tres
// microservicios para facilitar QA y dar una experiencia consistente.
package apperror

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
)

// sobre es la estructura JSON que se envía al cliente en cualquier error.
//
//	{ "error": { "codigo": "CREDENCIALES_INVALIDAS", "mensaje": "..." } }
type sobre struct {
	Error cuerpo `json:"error"`
}

type cuerpo struct {
	Codigo  string `json:"codigo"`
	Mensaje string `json:"mensaje"`
}

// AppError es un error de dominio con un código estable en MAYÚSCULAS_CON_GUION
// y el status HTTP con el que debe responderse.
type AppError struct {
	Status  int
	Codigo  string
	Mensaje string
}

func (e *AppError) Error() string { return e.Codigo + ": " + e.Mensaje }

// Nuevo construye un AppError puntual (útil para validaciones específicas).
func Nuevo(status int, codigo, mensaje string) *AppError {
	return &AppError{Status: status, Codigo: codigo, Mensaje: mensaje}
}

// Errores comunes del auth-service.
var (
	ErrSolicitudInvalida    = &AppError{http.StatusBadRequest, "SOLICITUD_INVALIDA", "La solicitud no es válida."}
	ErrCredencialesInvalidas = &AppError{http.StatusUnauthorized, "CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos."}
	ErrTokenAusente         = &AppError{http.StatusUnauthorized, "TOKEN_AUSENTE", "Falta el token de autenticación."}
	ErrTokenInvalido        = &AppError{http.StatusUnauthorized, "TOKEN_INVALIDO", "El token es inválido o expiró."}
	ErrUsuarioNoEncontrado  = &AppError{http.StatusNotFound, "USUARIO_NO_ENCONTRADO", "El usuario no existe."}
	ErrInterno              = &AppError{http.StatusInternalServerError, "ERROR_INTERNO", "Ocurrió un error interno."}
)

// Escribir serializa el error como el sobre estándar. Si no es un *AppError, se
// registra el detalle real en el log y se responde con un 500 genérico para no
// filtrar información sensible al cliente.
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

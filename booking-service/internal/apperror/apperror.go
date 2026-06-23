// Package apperror define el sobre de error estándar y los códigos estables del
// booking-service. La forma del error es idéntica en los tres microservicios.
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

// Nuevo construye un AppError puntual.
func Nuevo(status int, codigo, mensaje string) *AppError {
	return &AppError{Status: status, Codigo: codigo, Mensaje: mensaje}
}

// Errores comunes del booking-service.
var (
	ErrSolicitudInvalida   = &AppError{http.StatusBadRequest, "SOLICITUD_INVALIDA", "La solicitud no es válida."}
	ErrHorarioInvalido     = &AppError{http.StatusBadRequest, "HORARIO_INVALIDO", "La hora de fin debe ser mayor que la de inicio."}
	ErrFechaInvalida       = &AppError{http.StatusBadRequest, "FECHA_INVALIDA", "La fecha o la hora tienen un formato inválido."}
	ErrFechaPasada         = &AppError{http.StatusBadRequest, "FECHA_PASADA", "No se puede reservar en el pasado."}
	ErrAsistentesInvalidos = &AppError{http.StatusBadRequest, "ASISTENTES_INVALIDOS", "El número de asistentes debe ser mayor a cero."}
	ErrCapacidadExcedida   = &AppError{http.StatusBadRequest, "CAPACIDAD_EXCEDIDA", "El número de asistentes supera la capacidad del espacio."}
	ErrReservaSolapada     = &AppError{http.StatusConflict, "RESERVA_SOLAPADA", "El espacio ya está reservado en ese horario."}
	ErrEspacioNoEncontrado = &AppError{http.StatusNotFound, "ESPACIO_NO_ENCONTRADO", "El espacio no existe."}
	ErrReservaNoEncontrada = &AppError{http.StatusNotFound, "RESERVA_NO_ENCONTRADA", "La reserva no existe."}
	ErrAccesoDenegado      = &AppError{http.StatusForbidden, "ACCESO_DENEGADO", "No puedes gestionar una reserva ajena."}
	ErrTokenAusente        = &AppError{http.StatusUnauthorized, "TOKEN_AUSENTE", "Falta el token de autenticación."}
	ErrTokenInvalido       = &AppError{http.StatusUnauthorized, "TOKEN_INVALIDO", "El token es inválido o expiró."}
	ErrCatalogoNoDisponible = &AppError{http.StatusBadGateway, "CATALOGO_NO_DISPONIBLE", "No se pudo validar el espacio con el catálogo."}
	ErrInterno             = &AppError{http.StatusInternalServerError, "ERROR_INTERNO", "Ocurrió un error interno."}
)

// Escribir serializa el error como el sobre estándar.
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

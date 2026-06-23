package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/i0dk1/OfficeSpace/booking-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/middleware"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/models"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/services"
)

// ReservaHandler expone los endpoints del motor de reservas.
type ReservaHandler struct {
	svc *services.ReservaService
}

func NewReservaHandler(svc *services.ReservaService) *ReservaHandler {
	return &ReservaHandler{svc: svc}
}

// Crear registra una nueva reserva validando solapamiento, fechas y capacidad.
//
//	@Summary		Crear reserva
//	@Description	Valida consistencia temporal, que no sea en el pasado (TZ America/Mexico_City), capacidad (vía HTTP a catalog) y no solapamiento. Devuelve 409 si el horario ya está ocupado.
//	@Tags			reservas
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			reserva	body		models.CrearReservaRequest	true	"Datos de la reserva"
//	@Success		201		{object}	models.Reserva
//	@Failure		400		{object}	apperror.AppError
//	@Failure		401		{object}	apperror.AppError
//	@Failure		409		{object}	apperror.AppError
//	@Router			/bookings [post]
func (h *ReservaHandler) Crear(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsDesdeContexto(r.Context())
	if !ok {
		apperror.Escribir(w, apperror.ErrTokenInvalido)
		return
	}
	var req models.CrearReservaRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		apperror.Escribir(w, apperror.ErrSolicitudInvalida)
		return
	}
	token := middleware.TokenDesdeContexto(r.Context())
	reserva, err := h.svc.CrearReserva(r.Context(), token, claims.Subject, req)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	responderJSON(w, http.StatusCreated, reserva)
}

// MisReservas devuelve las reservas del usuario autenticado.
//
//	@Summary		Mis reservas
//	@Tags			reservas
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{array}		models.Reserva
//	@Failure		401	{object}	apperror.AppError
//	@Router			/bookings/mine [get]
func (h *ReservaHandler) MisReservas(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsDesdeContexto(r.Context())
	if !ok {
		apperror.Escribir(w, apperror.ErrTokenInvalido)
		return
	}
	reservas, err := h.svc.MisReservas(r.Context(), claims.Subject)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	responderJSON(w, http.StatusOK, reservas)
}

// Disponibilidad indica si un espacio está libre en un intervalo.
//
//	@Summary		Disponibilidad de un espacio
//	@Tags			reservas
//	@Produce		json
//	@Security		BearerAuth
//	@Param			espacio_id	query		int		true	"ID del espacio"
//	@Param			fecha		query		string	true	"Fecha YYYY-MM-DD"
//	@Param			inicio		query		string	true	"Hora inicio HH:MM"
//	@Param			fin			query		string	true	"Hora fin HH:MM"
//	@Success		200			{object}	models.DisponibilidadResponse
//	@Failure		400			{object}	apperror.AppError
//	@Router			/bookings/availability [get]
func (h *ReservaHandler) Disponibilidad(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	espacioID, err := strconv.Atoi(q.Get("espacio_id"))
	if err != nil || espacioID <= 0 {
		apperror.Escribir(w, apperror.Nuevo(http.StatusBadRequest, "ESPACIO_ID_INVALIDO", "espacio_id debe ser un entero positivo."))
		return
	}
	resp, err := h.svc.Disponibilidad(r.Context(), espacioID, q.Get("fecha"), q.Get("inicio"), q.Get("fin"))
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	responderJSON(w, http.StatusOK, resp)
}

// Ocupacion devuelve las reservas confirmadas de una fecha (dashboard admin).
//
//	@Summary		Ocupación del día
//	@Description	Reservas confirmadas de una fecha. Alimenta el dashboard de ocupación del administrador.
//	@Tags			reservas
//	@Produce		json
//	@Security		BearerAuth
//	@Param			fecha	query		string	true	"Fecha YYYY-MM-DD"
//	@Success		200		{array}		models.Reserva
//	@Failure		400		{object}	apperror.AppError
//	@Router			/occupancy [get]
func (h *ReservaHandler) Ocupacion(w http.ResponseWriter, r *http.Request) {
	reservas, err := h.svc.Ocupacion(r.Context(), r.URL.Query().Get("fecha"))
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	responderJSON(w, http.StatusOK, reservas)
}

// Cancelar cancela una reserva propia (libera el horario).
//
//	@Summary		Cancelar reserva
//	@Description	Cancela una reserva propia (estado → CANCELADA). Una reserva ajena devuelve 403.
//	@Tags			reservas
//	@Produce		json
//	@Security		BearerAuth
//	@Param			id	path		int	true	"ID de la reserva"
//	@Success		200	{object}	models.Reserva
//	@Failure		401	{object}	apperror.AppError
//	@Failure		403	{object}	apperror.AppError
//	@Failure		404	{object}	apperror.AppError
//	@Router			/bookings/{id} [delete]
func (h *ReservaHandler) Cancelar(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsDesdeContexto(r.Context())
	if !ok {
		apperror.Escribir(w, apperror.ErrTokenInvalido)
		return
	}
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil || id <= 0 {
		apperror.Escribir(w, apperror.Nuevo(http.StatusBadRequest, "ID_INVALIDO", "El id de la reserva debe ser un entero positivo."))
		return
	}
	reserva, err := h.svc.Cancelar(r.Context(), id, claims.Subject)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	responderJSON(w, http.StatusOK, reserva)
}

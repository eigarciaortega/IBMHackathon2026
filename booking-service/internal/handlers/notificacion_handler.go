package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/i0dk1/OfficeSpace/booking-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/middleware"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/models"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/notifications"
)

// NotificacionRepo es la dependencia de datos del handler (interfaz para pruebas).
type NotificacionRepo interface {
	ListarRecientes(ctx context.Context, limite int) ([]models.Notificacion, error)
	ContarNoLeidas(ctx context.Context) (int, error)
	MarcarTodasLeidas(ctx context.Context) error
}

// NotificacionHandler expone el historial, el marcado como leídas y el flujo SSE
// en tiempo real del centro de notificaciones del administrador.
type NotificacionHandler struct {
	repo   NotificacionRepo
	hub    *notifications.Hub
	secret []byte
}

func NewNotificacionHandler(repo NotificacionRepo, hub *notifications.Hub, secret []byte) *NotificacionHandler {
	return &NotificacionHandler{repo: repo, hub: hub, secret: secret}
}

const limiteHistorial = 50

// Listar devuelve el historial reciente y el conteo de no leídas.
//
//	@Summary		Listar notificaciones
//	@Description	Historial reciente de notificaciones y conteo de no leídas (solo ADMINISTRADOR).
//	@Tags			notificaciones
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{object}	models.ListaNotificaciones
//	@Failure		401	{object}	apperror.AppError
//	@Failure		403	{object}	apperror.AppError
//	@Router			/notifications [get]
func (h *NotificacionHandler) Listar(w http.ResponseWriter, r *http.Request) {
	lista, err := h.repo.ListarRecientes(r.Context(), limiteHistorial)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	noLeidas, err := h.repo.ContarNoLeidas(r.Context())
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	responderJSON(w, http.StatusOK, models.ListaNotificaciones{Notificaciones: lista, NoLeidas: noLeidas})
}

// MarcarLeidas marca como leídas todas las notificaciones pendientes.
//
//	@Summary		Marcar notificaciones como leídas
//	@Tags			notificaciones
//	@Produce		json
//	@Security		BearerAuth
//	@Success		204	"Sin contenido"
//	@Failure		401	{object}	apperror.AppError
//	@Failure		403	{object}	apperror.AppError
//	@Router			/notifications/read [post]
func (h *NotificacionHandler) MarcarLeidas(w http.ResponseWriter, r *http.Request) {
	if err := h.repo.MarcarTodasLeidas(r.Context()); err != nil {
		apperror.Escribir(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Stream entrega las notificaciones en tiempo real por Server-Sent Events.
//
// EventSource no permite enviar el header Authorization, por eso el token viaja
// como query param y se valida aquí (debe ser de un ADMINISTRADOR).
//
//	@Summary		Flujo de notificaciones en tiempo real (SSE)
//	@Description	Server-Sent Events. Autenticación por query param `token` (un JWT de ADMINISTRADOR), ya que EventSource no envía headers.
//	@Tags			notificaciones
//	@Produce		text/event-stream
//	@Param			token	query	string	true	"JWT de un administrador"
//	@Success		200		"Flujo de eventos"
//	@Failure		401		{object}	apperror.AppError
//	@Failure		403		{object}	apperror.AppError
//	@Router			/notifications/stream [get]
func (h *NotificacionHandler) Stream(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ValidarToken(h.secret, r.URL.Query().Get("token"))
	if err != nil {
		apperror.Escribir(w, apperror.ErrTokenInvalido)
		return
	}
	if claims.Rol != models.RolAdministrador {
		apperror.Escribir(w, apperror.ErrAccesoDenegado)
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		apperror.Escribir(w, apperror.ErrInterno)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	// Evita el buffering de proxies intermedios (nginx) ante el flujo SSE.
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	ch, cancelar := h.hub.Suscribir()
	defer cancelar()

	// Comentario inicial: abre el flujo y confirma la conexión al cliente.
	fmt.Fprint(w, ": conectado\n\n")
	flusher.Flush()

	keepalive := time.NewTicker(25 * time.Second)
	defer keepalive.Stop()

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, abierto := <-ch:
			if !abierto {
				return
			}
			fmt.Fprintf(w, "event: notificacion\ndata: %s\n\n", msg)
			flusher.Flush()
		case <-keepalive.C:
			fmt.Fprint(w, ": keepalive\n\n")
			flusher.Flush()
		}
	}
}

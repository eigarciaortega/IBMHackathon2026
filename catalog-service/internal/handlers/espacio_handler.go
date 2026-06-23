package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/i0dk1/OfficeSpace/catalog-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/catalog-service/internal/middleware"
	"github.com/i0dk1/OfficeSpace/catalog-service/internal/models"
	"github.com/i0dk1/OfficeSpace/catalog-service/internal/services"
)

// EspacioHandler expone los endpoints de catálogo de espacios.
type EspacioHandler struct {
	svc *services.EspacioService
}

func NewEspacioHandler(svc *services.EspacioService) *EspacioHandler {
	return &EspacioHandler{svc: svc}
}

// Listar devuelve los espacios, con filtros opcionales.
//
//	@Summary		Listar espacios
//	@Description	Lista los espacios. Soporta filtros por tipo y capacidad mínima, aplicados en la consulta.
//	@Tags			espacios
//	@Produce		json
//	@Security		BearerAuth
//	@Param			tipo			query		string	false	"Filtra por tipo (SALA o DESK)"
//	@Param			capacidad_min	query		int		false	"Capacidad mínima"
//	@Success		200				{array}		models.Espacio
//	@Failure		401				{object}	apperror.AppError
//	@Router			/spaces [get]
func (h *EspacioHandler) Listar(w http.ResponseWriter, r *http.Request) {
	filtro := models.FiltroEspacios{Tipo: r.URL.Query().Get("tipo")}
	if cm := r.URL.Query().Get("capacidad_min"); cm != "" {
		n, err := strconv.Atoi(cm)
		if err != nil || n < 0 {
			apperror.Escribir(w, apperror.Nuevo(http.StatusBadRequest, "FILTRO_INVALIDO", "capacidad_min debe ser un entero no negativo."))
			return
		}
		filtro.CapacidadMin = n
	}

	espacios, err := h.svc.Listar(r.Context(), filtro)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	responderJSON(w, http.StatusOK, espacios)
}

// Obtener devuelve un espacio por id.
//
//	@Summary		Obtener espacio
//	@Tags			espacios
//	@Produce		json
//	@Security		BearerAuth
//	@Param			id	path		int	true	"ID del espacio"
//	@Success		200	{object}	models.Espacio
//	@Failure		404	{object}	apperror.AppError
//	@Router			/spaces/{id} [get]
func (h *EspacioHandler) Obtener(w http.ResponseWriter, r *http.Request) {
	id, err := idDeRuta(r)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	espacio, err := h.svc.Obtener(r.Context(), id)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	responderJSON(w, http.StatusOK, espacio)
}

// Crear registra un nuevo espacio (solo ADMINISTRADOR).
//
//	@Summary		Crear espacio
//	@Tags			espacios
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			espacio	body		models.EspacioRequest	true	"Datos del espacio"
//	@Success		201		{object}	models.Espacio
//	@Failure		400		{object}	apperror.AppError
//	@Failure		401		{object}	apperror.AppError
//	@Failure		403		{object}	apperror.AppError
//	@Router			/spaces [post]
func (h *EspacioHandler) Crear(w http.ResponseWriter, r *http.Request) {
	req, err := decodificar(w, r)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	espacio, err := h.svc.Crear(r.Context(), req, actorDe(r))
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	responderJSON(w, http.StatusCreated, espacio)
}

// Actualizar modifica un espacio existente (solo ADMINISTRADOR).
//
//	@Summary		Actualizar espacio
//	@Tags			espacios
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			id		path		int						true	"ID del espacio"
//	@Param			espacio	body		models.EspacioRequest	true	"Datos del espacio"
//	@Success		200		{object}	models.Espacio
//	@Failure		400		{object}	apperror.AppError
//	@Failure		404		{object}	apperror.AppError
//	@Router			/spaces/{id} [put]
func (h *EspacioHandler) Actualizar(w http.ResponseWriter, r *http.Request) {
	id, err := idDeRuta(r)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	req, err := decodificar(w, r)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	espacio, err := h.svc.Actualizar(r.Context(), id, req, actorDe(r))
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	responderJSON(w, http.StatusOK, espacio)
}

// Eliminar borra un espacio (solo ADMINISTRADOR).
//
//	@Summary		Eliminar espacio
//	@Tags			espacios
//	@Produce		json
//	@Security		BearerAuth
//	@Param			id	path	int	true	"ID del espacio"
//	@Success		204	"Sin contenido"
//	@Failure		404	{object}	apperror.AppError
//	@Router			/spaces/{id} [delete]
func (h *EspacioHandler) Eliminar(w http.ResponseWriter, r *http.Request) {
	id, err := idDeRuta(r)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	if err := h.svc.Eliminar(r.Context(), id, actorDe(r)); err != nil {
		apperror.Escribir(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// actorDe extrae el email del usuario autenticado para registrar la autoría de la
// acción en la notificación. Devuelve "" si no hay claims (p. ej. en pruebas).
func actorDe(r *http.Request) string {
	if claims, ok := middleware.ClaimsDesdeContexto(r.Context()); ok {
		return claims.Subject
	}
	return ""
}

func idDeRuta(r *http.Request) (int, error) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil || id <= 0 {
		return 0, apperror.Nuevo(http.StatusBadRequest, "ID_INVALIDO", "El id del espacio debe ser un entero positivo.")
	}
	return id, nil
}

func decodificar(w http.ResponseWriter, r *http.Request) (models.EspacioRequest, error) {
	var req models.EspacioRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		return req, apperror.ErrSolicitudInvalida
	}
	return req, nil
}

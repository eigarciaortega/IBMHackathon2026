package handlers

import (
	"net/http"

	"github.com/i0dk1/OfficeSpace/catalog-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/catalog-service/internal/models"
	"github.com/i0dk1/OfficeSpace/catalog-service/internal/services"
)

// RecursoHandler expone el CRUD del catálogo de recursos.
type RecursoHandler struct {
	svc *services.RecursoService
}

func NewRecursoHandler(svc *services.RecursoService) *RecursoHandler {
	return &RecursoHandler{svc: svc}
}

// Listar devuelve el catálogo de recursos.
//
//	@Summary		Listar recursos
//	@Tags			recursos
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{array}		models.Recurso
//	@Failure		401	{object}	apperror.AppError
//	@Router			/resources [get]
func (h *RecursoHandler) Listar(w http.ResponseWriter, r *http.Request) {
	recursos, err := h.svc.Listar(r.Context())
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	responderJSON(w, http.StatusOK, recursos)
}

// Crear registra un recurso nuevo (solo ADMINISTRADOR).
//
//	@Summary		Crear recurso
//	@Tags			recursos
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			recurso	body		models.RecursoRequest	true	"Datos del recurso"
//	@Success		201		{object}	models.Recurso
//	@Failure		400		{object}	apperror.AppError
//	@Failure		403		{object}	apperror.AppError
//	@Failure		409		{object}	apperror.AppError
//	@Router			/resources [post]
func (h *RecursoHandler) Crear(w http.ResponseWriter, r *http.Request) {
	var req models.RecursoRequest
	if err := decodificarJSON(w, r, &req); err != nil {
		apperror.Escribir(w, err)
		return
	}
	recurso, err := h.svc.Crear(r.Context(), req)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	responderJSON(w, http.StatusCreated, recurso)
}

// Actualizar renombra un recurso (solo ADMINISTRADOR).
//
//	@Summary		Actualizar recurso
//	@Tags			recursos
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			id		path		int						true	"ID del recurso"
//	@Param			recurso	body		models.RecursoRequest	true	"Datos del recurso"
//	@Success		200		{object}	models.Recurso
//	@Failure		404		{object}	apperror.AppError
//	@Failure		409		{object}	apperror.AppError
//	@Router			/resources/{id} [put]
func (h *RecursoHandler) Actualizar(w http.ResponseWriter, r *http.Request) {
	id, err := idDeRuta(r)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	var req models.RecursoRequest
	if err := decodificarJSON(w, r, &req); err != nil {
		apperror.Escribir(w, err)
		return
	}
	recurso, err := h.svc.Actualizar(r.Context(), id, req)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	responderJSON(w, http.StatusOK, recurso)
}

// Eliminar borra un recurso del catálogo (solo ADMINISTRADOR). Sus asignaciones a
// espacios se borran en cascada.
//
//	@Summary		Eliminar recurso
//	@Tags			recursos
//	@Produce		json
//	@Security		BearerAuth
//	@Param			id	path	int	true	"ID del recurso"
//	@Success		204	"Sin contenido"
//	@Failure		404	{object}	apperror.AppError
//	@Router			/resources/{id} [delete]
func (h *RecursoHandler) Eliminar(w http.ResponseWriter, r *http.Request) {
	id, err := idDeRuta(r)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	if err := h.svc.Eliminar(r.Context(), id); err != nil {
		apperror.Escribir(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

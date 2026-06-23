package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/i0dk1/OfficeSpace/auth-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/auth-service/internal/middleware"
	"github.com/i0dk1/OfficeSpace/auth-service/internal/models"
	"github.com/i0dk1/OfficeSpace/auth-service/internal/services"
)

// AuthHandler expone los endpoints de autenticación.
type AuthHandler struct {
	svc *services.AuthService
}

func NewAuthHandler(svc *services.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

// Login autentica al usuario y emite un JWT.
//
//	@Summary		Iniciar sesión
//	@Description	Valida email y contraseña contra la base de datos y devuelve un JWT con el rol del usuario.
//	@Tags			autenticación
//	@Accept			json
//	@Produce		json
//	@Param			credenciales	body		models.LoginRequest	true	"Credenciales de acceso"
//	@Success		200				{object}	models.LoginResponse
//	@Failure		400				{object}	apperror.AppError
//	@Failure		401				{object}	apperror.AppError
//	@Router			/auth/login [post]
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		apperror.Escribir(w, apperror.ErrSolicitudInvalida)
		return
	}

	resp, err := h.svc.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	responderJSON(w, http.StatusOK, resp)
}

// Me devuelve los datos del usuario autenticado.
//
//	@Summary		Usuario autenticado
//	@Description	Devuelve los datos del usuario asociado al token JWT enviado.
//	@Tags			autenticación
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{object}	models.MeResponse
//	@Failure		401	{object}	apperror.AppError
//	@Failure		404	{object}	apperror.AppError
//	@Router			/auth/me [get]
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsDesdeContexto(r.Context())
	if !ok {
		apperror.Escribir(w, apperror.ErrTokenInvalido)
		return
	}

	resp, err := h.svc.ObtenerUsuario(r.Context(), claims.Subject)
	if err != nil {
		apperror.Escribir(w, err)
		return
	}
	responderJSON(w, http.StatusOK, resp)
}

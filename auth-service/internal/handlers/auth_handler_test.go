package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/i0dk1/OfficeSpace/auth-service/internal/apperror"
	"github.com/i0dk1/OfficeSpace/auth-service/internal/models"
	"github.com/i0dk1/OfficeSpace/auth-service/internal/services"
)

type repoFake struct{ usuario *models.Usuario }

func (f repoFake) ObtenerPorEmail(_ context.Context, email string) (*models.Usuario, error) {
	if f.usuario != nil && f.usuario.Email == email {
		return f.usuario, nil
	}
	return nil, apperror.ErrUsuarioNoEncontrado
}

func handlerDePrueba(t *testing.T) *AuthHandler {
	t.Helper()
	hash, _ := bcrypt.GenerateFromPassword([]byte("Admin123"), bcrypt.MinCost)
	repo := repoFake{usuario: &models.Usuario{
		Email: "admin@x.com", PasswordHash: string(hash), Rol: models.RolAdministrador, Nombre: "Admin",
	}}
	svc := services.NewAuthService(repo, []byte("secreto"), time.Hour)
	return NewAuthHandler(svc)
}

func TestLoginHandlerExitoso(t *testing.T) {
	h := handlerDePrueba(t)
	req := httptest.NewRequest(http.MethodPost, "/auth/login",
		strings.NewReader(`{"email":"admin@x.com","password":"Admin123"}`))
	rec := httptest.NewRecorder()

	h.Login(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; se esperaba 200 (cuerpo: %s)", rec.Code, rec.Body.String())
	}
	var resp models.LoginResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("respuesta no es JSON válido: %v", err)
	}
	if resp.Token == "" || resp.Rol != models.RolAdministrador {
		t.Errorf("respuesta inesperada: %+v", resp)
	}
}

func TestLoginHandlerCredencialesInvalidas(t *testing.T) {
	h := handlerDePrueba(t)
	req := httptest.NewRequest(http.MethodPost, "/auth/login",
		strings.NewReader(`{"email":"admin@x.com","password":"incorrecta"}`))
	rec := httptest.NewRecorder()

	h.Login(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d; se esperaba 401", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "CREDENCIALES_INVALIDAS") {
		t.Errorf("se esperaba el código CREDENCIALES_INVALIDAS; cuerpo: %s", rec.Body.String())
	}
}

func TestLoginHandlerJSONInvalido(t *testing.T) {
	h := handlerDePrueba(t)
	req := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(`{no es json`))
	rec := httptest.NewRecorder()

	h.Login(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d; se esperaba 400", rec.Code)
	}
}

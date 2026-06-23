package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/i0dk1/OfficeSpace/catalog-service/internal/models"
)

var secreto = []byte("secreto-de-prueba")

// firmar genera un token de prueba con el rol indicado.
func firmar(t *testing.T, rol string) string {
	t.Helper()
	claims := Claims{
		Rol: rol,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "user@x.com",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
	s, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secreto)
	if err != nil {
		t.Fatalf("no se pudo firmar: %v", err)
	}
	return s
}

func okHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
}

func TestRequiereJWT(t *testing.T) {
	h := RequiereJWT(secreto)(okHandler())

	t.Run("sin token → 401", func(t *testing.T) {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/spaces", nil))
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("status = %d; se esperaba 401", rec.Code)
		}
	})

	t.Run("token válido → 200", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/spaces", nil)
		req.Header.Set("Authorization", "Bearer "+firmar(t, models.RolColaborador))
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("status = %d; se esperaba 200", rec.Code)
		}
	})
}

func TestRequiereRol(t *testing.T) {
	// Cadena completa: RequiereJWT seguido de RequiereRol(ADMINISTRADOR).
	h := RequiereJWT(secreto)(RequiereRol(models.RolAdministrador)(okHandler()))

	casos := []struct {
		nombre         string
		rol            string
		statusEsperado int
	}{
		{"administrador permitido", models.RolAdministrador, http.StatusOK},
		{"colaborador denegado", models.RolColaborador, http.StatusForbidden},
	}
	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/spaces", nil)
			req.Header.Set("Authorization", "Bearer "+firmar(t, c.rol))
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != c.statusEsperado {
				t.Errorf("status = %d; se esperaba %d", rec.Code, c.statusEsperado)
			}
		})
	}
}

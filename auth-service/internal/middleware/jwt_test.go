package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

var secretoPrueba = []byte("secreto-de-prueba-para-tests")

func TestGenerarYValidarToken(t *testing.T) {
	token, err := GenerarToken(secretoPrueba, time.Hour, "user@x.com", "COLABORADOR")
	if err != nil {
		t.Fatalf("no se esperaba error al generar: %v", err)
	}

	claims, err := ValidarToken(secretoPrueba, token)
	if err != nil {
		t.Fatalf("no se esperaba error al validar: %v", err)
	}
	if claims.Subject != "user@x.com" {
		t.Errorf("subject = %q; se esperaba user@x.com", claims.Subject)
	}
	if claims.Rol != "COLABORADOR" {
		t.Errorf("rol = %q; se esperaba COLABORADOR", claims.Rol)
	}
}

func TestValidarTokenExpirado(t *testing.T) {
	token, _ := GenerarToken(secretoPrueba, -time.Minute, "user@x.com", "COLABORADOR")
	if _, err := ValidarToken(secretoPrueba, token); err == nil {
		t.Fatal("un token expirado debió ser rechazado")
	}
}

func TestValidarTokenFirmaInvalida(t *testing.T) {
	token, _ := GenerarToken(secretoPrueba, time.Hour, "user@x.com", "COLABORADOR")
	if _, err := ValidarToken([]byte("otro-secreto"), token); err == nil {
		t.Fatal("un token con firma de otro secreto debió ser rechazado")
	}
}

func TestRequiereJWT(t *testing.T) {
	siguiente := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := ClaimsDesdeContexto(r.Context())
		if !ok {
			t.Error("se esperaban claims en el contexto")
		} else if claims.Subject != "user@x.com" {
			t.Errorf("subject en contexto = %q", claims.Subject)
		}
		w.WriteHeader(http.StatusOK)
	})
	handler := RequiereJWT(secretoPrueba)(siguiente)

	casos := []struct {
		nombre       string
		autorizacion string
		statusEsperado int
	}{
		{"sin header", "", http.StatusUnauthorized},
		{"esquema incorrecto", "Token abc", http.StatusUnauthorized},
		{"token inválido", "Bearer abc.def.ghi", http.StatusUnauthorized},
	}
	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/protegido", nil)
			if c.autorizacion != "" {
				req.Header.Set("Authorization", c.autorizacion)
			}
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			if rec.Code != c.statusEsperado {
				t.Errorf("status = %d; se esperaba %d", rec.Code, c.statusEsperado)
			}
		})
	}

	t.Run("token válido", func(t *testing.T) {
		token, _ := GenerarToken(secretoPrueba, time.Hour, "user@x.com", "COLABORADOR")
		req := httptest.NewRequest(http.MethodGet, "/protegido", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("status = %d; se esperaba 200", rec.Code)
		}
	})
}

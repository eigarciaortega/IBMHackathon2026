// Package middleware contiene los middlewares HTTP del booking-service.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"github.com/i0dk1/OfficeSpace/booking-service/internal/apperror"
)

type claveContexto string

const (
	claveClaims claveContexto = "claims"
	claveToken  claveContexto = "token"
)

// Claims son las afirmaciones del JWT emitido por auth-service.
type Claims struct {
	Rol string `json:"rol"`
	jwt.RegisteredClaims
}

// ValidarToken parsea y verifica la firma y vigencia de un token.
func ValidarToken(secret []byte, tokenStr string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, apperror.ErrTokenInvalido
		}
		return secret, nil
	})
	if err != nil {
		return nil, apperror.ErrTokenInvalido
	}
	return claims, nil
}

// RequiereJWT exige un Bearer token válido y guarda los claims y el token crudo
// en el contexto. El token se reenvía a catalog-service para validar capacidad.
func RequiereJWT(secret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenStr, err := extraerBearer(r)
			if err != nil {
				apperror.Escribir(w, err)
				return
			}
			claims, err := ValidarToken(secret, tokenStr)
			if err != nil {
				apperror.Escribir(w, err)
				return
			}
			ctx := context.WithValue(r.Context(), claveClaims, claims)
			ctx = context.WithValue(ctx, claveToken, tokenStr)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ClaimsDesdeContexto recupera los claims inyectados por RequiereJWT.
func ClaimsDesdeContexto(ctx context.Context) (*Claims, bool) {
	claims, ok := ctx.Value(claveClaims).(*Claims)
	return claims, ok
}

// TokenDesdeContexto recupera el token crudo para reenviarlo a otros servicios.
func TokenDesdeContexto(ctx context.Context) string {
	if t, ok := ctx.Value(claveToken).(string); ok {
		return t
	}
	return ""
}

func extraerBearer(r *http.Request) (string, error) {
	encabezado := r.Header.Get("Authorization")
	if encabezado == "" {
		return "", apperror.ErrTokenAusente
	}
	partes := strings.SplitN(encabezado, " ", 2)
	if len(partes) != 2 || !strings.EqualFold(partes[0], "Bearer") || strings.TrimSpace(partes[1]) == "" {
		return "", apperror.ErrTokenInvalido
	}
	return strings.TrimSpace(partes[1]), nil
}

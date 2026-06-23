// Package middleware contiene los middlewares HTTP del servicio: validación de
// JWT y CORS. La generación y validación de tokens vive aquí para mantener toda
// la lógica de JWT en un solo lugar (el contrato compartido entre servicios).
package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/i0dk1/OfficeSpace/auth-service/internal/apperror"
)

// claveContexto es un tipo privado para evitar colisiones en el context.Context.
type claveContexto string

const claveClaims claveContexto = "claims"

// Claims son las afirmaciones que viajan dentro del JWT. Incluye el rol del
// usuario además de los campos registrados estándar (sub = email, exp, iat).
type Claims struct {
	Rol string `json:"rol"`
	jwt.RegisteredClaims
}

// GenerarToken firma un JWT para el usuario indicado con la expiración dada.
func GenerarToken(secret []byte, expira time.Duration, email, rol string) (string, error) {
	ahora := time.Now()
	claims := Claims{
		Rol: rol,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   email,
			IssuedAt:  jwt.NewNumericDate(ahora),
			ExpiresAt: jwt.NewNumericDate(ahora.Add(expira)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
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

// RequiereJWT es el middleware que protege endpoints: exige un header
// Authorization: Bearer <token> válido y guarda los claims en el contexto.
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
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ClaimsDesdeContexto recupera los claims inyectados por RequiereJWT.
func ClaimsDesdeContexto(ctx context.Context) (*Claims, bool) {
	claims, ok := ctx.Value(claveClaims).(*Claims)
	return claims, ok
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

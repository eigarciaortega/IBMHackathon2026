package middleware

import (
	"net/http"
	"strings"
)

// CORS devuelve un middleware que habilita CORS para los orígenes permitidos,
// configurable por entorno (CORS_ALLOWED_ORIGINS).
func CORS(origenesPermitidos []string) func(http.Handler) http.Handler {
	permitidos := make(map[string]bool, len(origenesPermitidos))
	comodin := false
	for _, o := range origenesPermitidos {
		if o == "*" {
			comodin = true
		}
		permitidos[o] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origen := r.Header.Get("Origin")
			if origen != "" && (comodin || permitidos[origen]) {
				permitido := origen
				if comodin {
					permitido = "*"
				}
				w.Header().Set("Access-Control-Allow-Origin", permitido)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
				w.Header().Set("Access-Control-Max-Age", "300")
			}

			if r.Method == http.MethodOptions && strings.TrimSpace(r.Header.Get("Access-Control-Request-Method")) != "" {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

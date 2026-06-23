package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"os"
)

type contextKey string

const TransactionIDKey contextKey = "transaction_id"

func TransactionID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		txID := r.Header.Get("X-Transaction-ID")
		if txID == "" {
			txID = r.Header.Get("X-Request-ID")
		}
		if txID == "" {
			txID = "sin-id"
		}
		ctx := context.WithValue(r.Context(), TransactionIDKey, txID)
		w.Header().Set("X-Transaction-ID", txID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				txID, _ := r.Context().Value(TransactionIDKey).(string)
				slog.Error("pánico recuperado", "panic", rec, "transaction_id", txID)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte(`{"error":"internal_error","mensaje":"Error interno del servidor."}`))
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		txID, _ := r.Context().Value(TransactionIDKey).(string)
		slog.Info("petición recibida",
			"method", r.Method,
			"path", r.URL.Path,
			"transaction_id", txID,
		)
		next.ServeHTTP(w, r)
	})
}

func GetenvOrDefault(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
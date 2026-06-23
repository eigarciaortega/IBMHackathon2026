package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	httpSwagger "github.com/swaggo/http-swagger"

	"github.com/i0dk1/NeoWallet/processor-service/internal/middleware"
	"github.com/i0dk1/NeoWallet/processor-service/internal/services"
)

func SetupRouter(svc *services.TransferService) http.Handler {
	h := New(svc)
	r := chi.NewRouter()

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Internal-Key"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Use(middleware.Recovery)
	r.Use(middleware.TransactionID)
	r.Use(middleware.LoggingMiddleware)

	r.Get("/health", h.Health)

	r.Get("/api-docs", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/api-docs/", http.StatusMovedPermanently)
	})
	r.Get("/api-docs/*", httpSwagger.Handler(
		httpSwagger.URL("/api-docs/doc.json"),
	))

	r.Post("/api/transfer", h.Transfer)

	r.Get("/api/transactions/{user_id}", h.GetTransactions)

	return r
}
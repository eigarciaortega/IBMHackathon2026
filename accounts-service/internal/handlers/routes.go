package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	httpSwagger "github.com/swaggo/http-swagger"

	"github.com/mirto/neowallet/accounts-service/internal/middleware"
	"github.com/mirto/neowallet/accounts-service/internal/services"
)

func SetupRouter(svc *services.AccountService, internalAPIKey string) http.Handler {
	h := New(svc)
	r := chi.NewRouter()

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

	r.Route("/accounts", func(r chi.Router) {
		r.Get("/{user_id}", h.GetAccount)

		r.Group(func(r chi.Router) {
			r.Use(middleware.InternalAuth(internalAPIKey))
			r.Post("/update-balance", h.UpdateBalance)
		})
	})

	r.Post("/api/recharge", h.Recharge)

	return r
}
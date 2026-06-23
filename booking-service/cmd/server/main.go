// booking-service: motor de reservas de OfficeSpace (núcleo crítico).
//
//	@title			OfficeSpace — Booking Service
//	@version		1.0
//	@description	Motor de reservas: valida solapamiento, fechas y capacidad (vía HTTP a catalog). Expone la ocupación del día.
//	@BasePath		/
//
//	@securityDefinitions.apikey	BearerAuth
//	@in							header
//	@name						Authorization
//	@description				Escribe: Bearer {token}
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	httpSwagger "github.com/swaggo/http-swagger"

	_ "github.com/i0dk1/OfficeSpace/booking-service/docs"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/clients"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/config"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/handlers"
	appmw "github.com/i0dk1/OfficeSpace/booking-service/internal/middleware"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/repository"
	"github.com/i0dk1/OfficeSpace/booking-service/internal/services"
)

const nombreServicio = "booking-service"

func main() {
	cfg, err := config.Cargar()
	if err != nil {
		log.Fatalf("configuración inválida: %v", err)
	}

	// Zona horaria explícita para la regla "no reservar en el pasado".
	loc, err := time.LoadLocation(cfg.TZ)
	if err != nil {
		log.Printf("no se pudo cargar la zona %q, usando UTC: %v", cfg.TZ, err)
		loc = time.UTC
	}
	time.Local = loc

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	pool, err := conectarBD(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("no se pudo conectar a la base de datos: %v", err)
	}
	defer pool.Close()

	repo := repository.NewReservaRepository(pool)
	catalog := clients.NewCatalogClient(cfg.CatalogBaseURL)
	svc := services.NewReservaService(repo, catalog, loc)
	handler := handlers.NewReservaHandler(svc)

	router := construirRouter(cfg, handler)

	servidor := &http.Server{
		Addr:              ":" + cfg.Puerto,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("%s escuchando en :%s", nombreServicio, cfg.Puerto)
		if err := servidor.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("error del servidor: %v", err)
		}
	}()

	<-ctx.Done()
	log.Printf("%s deteniéndose...", nombreServicio)
	apagado, cancelar := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelar()
	if err := servidor.Shutdown(apagado); err != nil {
		log.Printf("apagado forzado: %v", err)
	}
}

func conectarBD(ctx context.Context, url string) (*pgxpool.Pool, error) {
	ctxPing, cancelar := context.WithTimeout(ctx, 10*time.Second)
	defer cancelar()

	pool, err := pgxpool.New(ctxPing, url)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctxPing); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}

func construirRouter(cfg *config.Config, h *handlers.ReservaHandler) http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(appmw.CORS(cfg.CORSAllowedOrigins))

	r.Get("/health", handlers.Salud(nombreServicio))

	secret := []byte(cfg.JWTSecret)
	r.Group(func(r chi.Router) {
		r.Use(appmw.RequiereJWT(secret))

		r.Post("/bookings", h.Crear)
		r.Get("/bookings/mine", h.MisReservas)
		r.Get("/bookings/availability", h.Disponibilidad)
		r.Delete("/bookings/{id}", h.Cancelar)
		r.Get("/occupancy", h.Ocupacion)
	})

	// Swagger UI servido en /api-docs (requisito del brief).
	r.Get("/api-docs", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/api-docs/index.html", http.StatusMovedPermanently)
	})
	r.Get("/api-docs/*", httpSwagger.Handler(httpSwagger.URL("/api-docs/doc.json")))

	return r
}

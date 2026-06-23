// @title           NeoWallet - Accounts Service
// @version         1.0
// @description     Servicio de cuentas de NeoWallet: consulta de saldo, recarga y actualización de balance con idempotencia.
// @host            localhost:3000
// @BasePath        /
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/mirto/neowallet/accounts-service/internal/handlers"
	"github.com/mirto/neowallet/accounts-service/internal/middleware"
	"github.com/mirto/neowallet/accounts-service/internal/repository"
	"github.com/mirto/neowallet/accounts-service/internal/services"

	_ "github.com/mirto/neowallet/accounts-service/docs"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	internalAPIKey := middleware.GetenvOrDefault("INTERNAL_API_KEY", "neowallet-internal-dev-key")

	dbHost := middleware.GetenvOrDefault("ACCOUNTS_DB_HOST", "localhost")
	dbPort := middleware.GetenvOrDefault("ACCOUNTS_DB_PORT", "5432")
	dbUser := middleware.GetenvOrDefault("ACCOUNTS_DB_USER", "neowallet")
	dbPass := middleware.GetenvOrDefault("ACCOUNTS_DB_PASSWORD", "neowallet_dev")
	dbName := middleware.GetenvOrDefault("ACCOUNTS_DB_NAME", "accounts_db")
	dbSSL := middleware.GetenvOrDefault("ACCOUNTS_DB_SSLMODE", "disable")

	dsn := "postgres://" + dbUser + ":" + dbPass + "@" + dbHost + ":" + dbPort + "/" + dbName + "?sslmode=" + dbSSL

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		slog.Error("no se pudo conectar a accounts_db", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		slog.Error("no se pudo hacer ping a accounts_db", "error", err)
		os.Exit(1)
	}

	slog.Info("conectado a accounts_db")

	repo := repository.New(pool)
	svc := services.New(repo)
	router := handlers.SetupRouter(svc, internalAPIKey)

	port := middleware.GetenvOrDefault("ACCOUNTS_SERVICE_PORT", "3000")
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("accounts-service iniciado", "puerto", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("error del servidor", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("apagando accounts-service...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("error al apagar servidor", "error", err)
	}
	slog.Info("accounts-service apagado")
}
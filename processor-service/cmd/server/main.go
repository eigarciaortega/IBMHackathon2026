// @title           NeoWallet - Processor Service
// @version         1.0
// @description     Orquestador de transferencias P2P con Saga y compensación.
// @host            localhost:3001
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

	"github.com/i0dk1/NeoWallet/processor-service/internal/clients"
	"github.com/i0dk1/NeoWallet/processor-service/internal/handlers"
	"github.com/i0dk1/NeoWallet/processor-service/internal/middleware"
	"github.com/i0dk1/NeoWallet/processor-service/internal/repository"
	"github.com/i0dk1/NeoWallet/processor-service/internal/services"

	_ "github.com/i0dk1/NeoWallet/processor-service/docs"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	internalAPIKey := middleware.GetenvOrDefault("INTERNAL_API_KEY", "neowallet-internal-dev-key")
	accountsServiceURL := middleware.GetenvOrDefault("ACCOUNTS_SERVICE_URL", "http://localhost:3000")

	dbHost := middleware.GetenvOrDefault("PROCESSOR_DB_HOST", "localhost")
	dbPort := middleware.GetenvOrDefault("PROCESSOR_DB_PORT", "5433")
	dbUser := middleware.GetenvOrDefault("PROCESSOR_DB_USER", "neowallet")
	dbPass := middleware.GetenvOrDefault("PROCESSOR_DB_PASSWORD", "neowallet_dev")
	dbName := middleware.GetenvOrDefault("PROCESSOR_DB_NAME", "processor_db")
	dbSSL := middleware.GetenvOrDefault("PROCESSOR_DB_SSLMODE", "disable")

	dsn := "postgres://" + dbUser + ":" + dbPass + "@" + dbHost + ":" + dbPort + "/" + dbName + "?sslmode=" + dbSSL

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		slog.Error("no se pudo conectar a processor_db", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		slog.Error("no se pudo hacer ping a processor_db", "error", err)
		os.Exit(1)
	}

	slog.Info("conectado a processor_db")

	accountsClient := clients.NewAccountsClient(accountsServiceURL, internalAPIKey)

	repo := repository.New(pool)
	svc := services.New(repo, accountsClient)

	// job de reconciliación cada 60s
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			slog.Info("ejecutando reconciliación de transacciones atascadas")
			svc.ReconcileStuckTransactions(context.Background(), 5)
		}
	}()

	router := handlers.SetupRouter(svc)

	port := middleware.GetenvOrDefault("PROCESSOR_SERVICE_PORT", "3001")
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("processor-service iniciado", "puerto", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("error del servidor", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("apagando processor-service...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("error al apagar servidor", "error", err)
	}
	slog.Info("processor-service apagado")
}
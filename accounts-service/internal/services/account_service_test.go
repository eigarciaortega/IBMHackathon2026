package services_test

import (
	"context"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	"github.com/i0dk1/NeoWallet/accounts-service/internal/models"
	"github.com/i0dk1/NeoWallet/accounts-service/internal/repository"
	"github.com/i0dk1/NeoWallet/accounts-service/internal/services"
)

func setupTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dsn := os.Getenv("TEST_ACCOUNTS_DB_DSN")
	if dsn == "" {
		host := envOrDefault("ACCOUNTS_DB_HOST", "localhost")
		port := envOrDefault("ACCOUNTS_DB_PORT", "5432")
		user := envOrDefault("ACCOUNTS_DB_USER", "neowallet")
		pass := envOrDefault("ACCOUNTS_DB_PASSWORD", "neowallet_dev")
		name := envOrDefault("ACCOUNTS_DB_NAME", "accounts_db")
		ssl := envOrDefault("ACCOUNTS_DB_SSLMODE", "disable")
		dsn = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", user, pass, host, port, name, ssl)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("no se pudo conectar a la base de datos de prueba: %v", err)
	}

	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("no se pudo hacer ping a la base de datos: %v", err)
	}

	return pool
}

func setupTestUser(t *testing.T, pool *pgxpool.Pool, name, email string, balance decimal.Decimal) int {
	t.Helper()
	ctx := context.Background()
	var id int
	err := pool.QueryRow(ctx,
		`INSERT INTO users (name, email, balance) VALUES ($1, $2, $3)
		 ON CONFLICT (email) DO UPDATE SET balance = $3, name = $1
		 RETURNING id`,
		name, email, balance,
	).Scan(&id)
	if err != nil {
		t.Fatalf("no se pudo crear usuario de prueba: %v", err)
	}

	// limpiar operaciones previas
	_, _ = pool.Exec(ctx, `DELETE FROM balance_operations WHERE user_id = $1`, id)

	return id
}

func cleanupUser(t *testing.T, pool *pgxpool.Pool, userID int) {
	t.Helper()
	_, _ = pool.Exec(context.Background(), `DELETE FROM balance_operations WHERE user_id = $1`, userID)
	_, _ = pool.Exec(context.Background(), `DELETE FROM users WHERE id = $1`, userID)
}

func TestGetUser(t *testing.T) {
	pool := setupTestDB(t)
	repo := repository.New(pool)
	svc := services.New(repo)

	id := setupTestUser(t, pool, "Usuario Test", "test.getuser@neowallet.com", decimal.NewFromInt(500))
	defer cleanupUser(t, pool, id)

	user, err := svc.GetUser(context.Background(), id)
	if err != nil {
		t.Fatalf("error obteniendo usuario: %v", err)
	}
	if user.ID != id {
		t.Errorf("ID esperado %d, obtenido %d", id, user.ID)
	}
	if !user.Balance.Equal(decimal.NewFromInt(500)) {
		t.Errorf("saldo esperado 500, obtenido %s", user.Balance.String())
	}
}

func TestGetUserNotFound(t *testing.T) {
	pool := setupTestDB(t)
	repo := repository.New(pool)
	svc := services.New(repo)

	_, err := svc.GetUser(context.Background(), 999999)
	if err == nil {
		t.Fatal("se esperaba error user_not_found")
	}
}

func TestRecharge(t *testing.T) {
	pool := setupTestDB(t)
	repo := repository.New(pool)
	svc := services.New(repo)

	id := setupTestUser(t, pool, "Usuario Recarga", "test.recharge@neowallet.com", decimal.NewFromInt(100))
	defer cleanupUser(t, pool, id)

	resp, err := svc.Recharge(context.Background(), models.RechargeRequest{
		UserID:        id,
		Amount:        decimal.NewFromFloat(50.50),
		PaymentMethod: "simulada",
	})
	if err != nil {
		t.Fatalf("error en recarga: %v", err)
	}

	expected := decimal.NewFromFloat(150.50)
	if !resp.NewBalance.Equal(expected) {
		t.Errorf("saldo esperado %s, obtenido %s", expected.String(), resp.NewBalance.String())
	}

	// verificar en BD
	user, err := svc.GetUser(context.Background(), id)
	if err != nil {
		t.Fatalf("error verificando usuario: %v", err)
	}
	if !user.Balance.Equal(expected) {
		t.Errorf("saldo en BD esperado %s, obtenido %s", expected.String(), user.Balance.String())
	}
}

func TestRechargeInvalidAmount(t *testing.T) {
	pool := setupTestDB(t)
	repo := repository.New(pool)
	svc := services.New(repo)

	id := setupTestUser(t, pool, "Usuario Recarga Inv", "test.recharge.inv@neowallet.com", decimal.NewFromInt(100))
	defer cleanupUser(t, pool, id)

	_, err := svc.Recharge(context.Background(), models.RechargeRequest{
		UserID:        id,
		Amount:        decimal.NewFromFloat(-50),
		PaymentMethod: "simulada",
	})
	if err == nil {
		t.Fatal("se esperaba error por monto negativo")
	}

	_, err = svc.Recharge(context.Background(), models.RechargeRequest{
		UserID:        id,
		Amount:        decimal.NewFromFloat(0),
		PaymentMethod: "simulada",
	})
	if err == nil {
		t.Fatal("se esperaba error por monto cero")
	}
}

func TestDebit(t *testing.T) {
	pool := setupTestDB(t)
	repo := repository.New(pool)
	svc := services.New(repo)

	id := setupTestUser(t, pool, "Usuario Débito", "test.debit@neowallet.com", decimal.NewFromInt(200))
	defer cleanupUser(t, pool, id)

	resp, err := svc.UpdateBalance(context.Background(), models.UpdateBalanceRequest{
		UserID:         id,
		Amount:         decimal.NewFromInt(80),
		Operation:      "debit",
		IdempotencyKey: "test-debit-001",
	})
	if err != nil {
		t.Fatalf("error en débito: %v", err)
	}

	expectedPrevious := decimal.NewFromInt(200)
	expectedNew := decimal.NewFromInt(120)

	if !resp.PreviousBalance.Equal(expectedPrevious) {
		t.Errorf("saldo previo esperado %s, obtenido %s", expectedPrevious.String(), resp.PreviousBalance.String())
	}
	if !resp.NewBalance.Equal(expectedNew) {
		t.Errorf("saldo nuevo esperado %s, obtenido %s", expectedNew.String(), resp.NewBalance.String())
	}
}

func TestDebitInsufficientFunds(t *testing.T) {
	pool := setupTestDB(t)
	repo := repository.New(pool)
	svc := services.New(repo)

	id := setupTestUser(t, pool, "Usuario Sin Fondos", "test.nofunds@neowallet.com", decimal.NewFromInt(50))
	defer cleanupUser(t, pool, id)

	_, err := svc.UpdateBalance(context.Background(), models.UpdateBalanceRequest{
		UserID:         id,
		Amount:         decimal.NewFromInt(100),
		Operation:      "debit",
		IdempotencyKey: "test-debit-nofunds",
	})
	if err == nil {
		t.Fatal("se esperaba error insufficient_funds")
	}
}

func TestIdempotencyDebit(t *testing.T) {
	pool := setupTestDB(t)
	repo := repository.New(pool)
	svc := services.New(repo)

	id := setupTestUser(t, pool, "Usuario Idempotencia", "test.idempotency@neowallet.com", decimal.NewFromInt(300))
	defer cleanupUser(t, pool, id)

	key := "test-idempotency-debit-001"

	// primer débito
	resp1, err := svc.UpdateBalance(context.Background(), models.UpdateBalanceRequest{
		UserID:         id,
		Amount:         decimal.NewFromInt(50),
		Operation:      "debit",
		IdempotencyKey: key,
	})
	if err != nil {
		t.Fatalf("error en primer débito: %v", err)
	}

	// mismo débito otra vez (idempotente)
	resp2, err := svc.UpdateBalance(context.Background(), models.UpdateBalanceRequest{
		UserID:         id,
		Amount:         decimal.NewFromInt(50),
		Operation:      "debit",
		IdempotencyKey: key,
	})
	if err != nil {
		t.Fatalf("error en débito idempotente: %v", err)
	}

	// el saldo debe ser el mismo (250), no 200
	if !resp1.NewBalance.Equal(resp2.NewBalance) {
		t.Errorf("idempotencia rota: saldo1=%s, saldo2=%s", resp1.NewBalance.String(), resp2.NewBalance.String())
	}

	expected := decimal.NewFromInt(250)
	if !resp2.NewBalance.Equal(expected) {
		t.Errorf("saldo esperado %s, obtenido %s", expected.String(), resp2.NewBalance.String())
	}
}

func TestConcurrencyNoOversell(t *testing.T) {
	if testing.Short() {
		t.Skip("omitido en modo corto: requiere BD")
	}

	pool := setupTestDB(t)
	repo := repository.New(pool)
	svc := services.New(repo)

	balanceInicial := decimal.NewFromInt(300)
	id := setupTestUser(t, pool, "Usuario Concurrencia", "test.concurrent@neowallet.com", balanceInicial)
	defer cleanupUser(t, pool, id)

	// 20 débitos concurrentes de 50 cada uno = 1000 total > 300 disponible
	// deben fallar varios, y el saldo nunca debe quedar negativo
	numGoroutines := 20
	amount := decimal.NewFromInt(50)

	var wg sync.WaitGroup
	exitos := 0
	var mu sync.Mutex

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			key := fmt.Sprintf("concurrent-debit-%d", idx)
			_, err := svc.UpdateBalance(context.Background(), models.UpdateBalanceRequest{
				UserID:         id,
				Amount:         amount,
				Operation:      "debit",
				IdempotencyKey: key,
			})
			if err == nil {
				mu.Lock()
				exitos++
				mu.Unlock()
			}
		}(i)
	}

	wg.Wait()

	// máximo 6 débitos exitosos (300/50)
	if exitos > 6 {
		t.Errorf("demasiados débitos exitosos bajo concurrencia: %d (máx 6)", exitos)
	}

	user, err := svc.GetUser(context.Background(), id)
	if err != nil {
		t.Fatalf("error verificando usuario: %v", err)
	}

	if user.Balance.LessThan(decimal.Zero) {
		t.Errorf("SALDO NEGATIVO bajo concurrencia: %s — el oversell ocurrió", user.Balance.String())
	}

	saldoEsperado := balanceInicial.Sub(amount.Mul(decimal.NewFromInt(int64(exitos))))
	if !user.Balance.Equal(saldoEsperado) {
		t.Errorf("saldo esperado %s, obtenido %s", saldoEsperado.String(), user.Balance.String())
	}

	t.Logf("débitos exitosos: %d, saldo final: %s", exitos, user.Balance.String())
}

func envOrDefault(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
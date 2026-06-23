package services_test

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	"github.com/i0dk1/NeoWallet/processor-service/internal/clients"
	"github.com/i0dk1/NeoWallet/processor-service/internal/models"
	"github.com/i0dk1/NeoWallet/processor-service/internal/repository"
	"github.com/i0dk1/NeoWallet/processor-service/internal/services"
)

func setupTestProcessor(t *testing.T) (*services.TransferService, *clients.AccountsClient, *pgxpool.Pool, func()) {
	t.Helper()

	host := envOrDefault("PROCESSOR_DB_HOST", "localhost")
	port := envOrDefault("PROCESSOR_DB_PORT", "5433")
	user := envOrDefault("PROCESSOR_DB_USER", "neowallet")
	pass := envOrDefault("PROCESSOR_DB_PASSWORD", "neowallet_dev")
	name := envOrDefault("PROCESSOR_DB_NAME", "processor_db")
	ssl := envOrDefault("PROCESSOR_DB_SSLMODE", "disable")

	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", user, pass, host, port, name, ssl)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("no se pudo conectar a processor_db: %v", err)
	}

	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("no se pudo hacer ping a processor_db: %v", err)
	}

	accountsURL := envOrDefault("ACCOUNTS_SERVICE_URL", "http://localhost:3000")
	apiKey := envOrDefault("INTERNAL_API_KEY", "neowallet-internal-dev-key")

	accountsClient := clients.NewAccountsClient(accountsURL, apiKey)
	repo := repository.New(pool)
	svc := services.New(repo, accountsClient)

	cleanup := func() {
		pool.Close()
	}

	return svc, accountsClient, pool, cleanup
}

func getTotalBalance(ctx context.Context, client *clients.AccountsClient, userIDs ...int) (decimal.Decimal, error) {
	total := decimal.Zero
	for _, id := range userIDs {
		user, err := client.GetUser(ctx, id)
		if err != nil {
			return decimal.Zero, err
		}
		if user != nil {
			total = total.Add(user.Balance)
		}
	}
	return total, nil
}

func TestTransferSelfNotAllowed(t *testing.T) {
	if testing.Short() {
		t.Skip("omitido en modo corto: requiere integración completa")
	}

	svc, _, _, cleanup := setupTestProcessor(t)
	defer cleanup()

	_, err := svc.Transfer(context.Background(), models.TransferRequest{
		SenderID:   1,
		ReceiverID: 1,
		Amount:     decimal.NewFromInt(100),
	})

	if err == nil {
		t.Fatal("se esperaba error self_transfer_not_allowed")
	}
	t.Logf("error esperado: %v", err)
}

func TestTransferInvalidAmount(t *testing.T) {
	if testing.Short() {
		t.Skip("omitido en modo corto: requiere integración completa")
	}

	svc, _, _, cleanup := setupTestProcessor(t)
	defer cleanup()

	_, err := svc.Transfer(context.Background(), models.TransferRequest{
		SenderID:   1,
		ReceiverID: 2,
		Amount:     decimal.NewFromInt(-50),
	})
	if err == nil {
		t.Fatal("se esperaba error invalid_amount por monto negativo")
	}

	_, err = svc.Transfer(context.Background(), models.TransferRequest{
		SenderID:   1,
		ReceiverID: 2,
		Amount:     decimal.Zero,
	})
	if err == nil {
		t.Fatal("se esperaba error invalid_amount por monto cero")
	}
}

func TestTransferHappyPath(t *testing.T) {
	if testing.Short() {
		t.Skip("omitido en modo corto: requiere integración completa")
	}

	svc, client, _, cleanup := setupTestProcessor(t)
	defer cleanup()

	ctx := context.Background()

	// obtener balances antes
	balanceAntes, err := getTotalBalance(ctx, client, 1, 2, 3)
	if err != nil {
		t.Fatalf("error obteniendo balances iniciales: %v", err)
	}
	t.Logf("balance total antes: %s", balanceAntes.String())

	resp, err := svc.Transfer(ctx, models.TransferRequest{
		SenderID:   1,
		ReceiverID: 2,
		Amount:     decimal.NewFromInt(100),
	})
	if err != nil {
		t.Fatalf("error en transferencia: %v", err)
	}

	t.Logf("transferencia completada: %s, status: %s", resp.TransactionID.String(), resp.Status)

	// verificar balances
	sender, err := client.GetUser(ctx, 1)
	if err != nil {
		t.Fatalf("error verificando remitente: %v", err)
	}
	receiver, err := client.GetUser(ctx, 2)
	if err != nil {
		t.Fatalf("error verificando destinatario: %v", err)
	}

	// los saldos semilla son: A=1000, B=50
	// después de transferir 100 de A a B: A=900, B=150
	expectedA := decimal.NewFromInt(900)
	expectedB := decimal.NewFromInt(150)

	if !sender.Balance.Equal(expectedA) {
		t.Errorf("saldo A esperado %s, obtenido %s", expectedA.String(), sender.Balance.String())
	}
	if !receiver.Balance.Equal(expectedB) {
		t.Errorf("saldo B esperado %s, obtenido %s", expectedB.String(), receiver.Balance.String())
	}

	// invariante: el total no cambió (sin recargas)
	balanceDespues, err := getTotalBalance(ctx, client, 1, 2, 3)
	if err != nil {
		t.Fatalf("error obteniendo balances finales: %v", err)
	}
	if !balanceAntes.Equal(balanceDespues) {
		t.Errorf("INVARIANTE DEL DINERO ROTO: antes=%s, después=%s", balanceAntes.String(), balanceDespues.String())
	}
	t.Logf("balance total después: %s (conservado)", balanceDespues.String())
}

func TestTransferInsufficientFunds(t *testing.T) {
	if testing.Short() {
		t.Skip("omitido en modo corto: requiere integración completa")
	}

	svc, client, _, cleanup := setupTestProcessor(t)
	defer cleanup()

	ctx := context.Background()

	balanceAntes, err := getTotalBalance(ctx, client, 1, 2, 3)
	if err != nil {
		t.Fatalf("error obteniendo balances iniciales: %v", err)
	}

	// B tiene solo 50, intentamos transferir 200
	_, err = svc.Transfer(ctx, models.TransferRequest{
		SenderID:   2,
		ReceiverID: 1,
		Amount:     decimal.NewFromInt(200),
	})
	if err == nil {
		t.Fatal("se esperaba error insufficient_funds")
	}
	t.Logf("error esperado: %v", err)

	// verificar que el dinero no cambió
	balanceDespues, err := getTotalBalance(ctx, client, 1, 2, 3)
	if err != nil {
		t.Fatalf("error obteniendo balances finales: %v", err)
	}
	if !balanceAntes.Equal(balanceDespues) {
		t.Errorf("el dinero cambió tras fallo: antes=%s, después=%s", balanceAntes.String(), balanceDespues.String())
	}
}

func TestMoneyInvariantAfterMultipleTransfers(t *testing.T) {
	if testing.Short() {
		t.Skip("omitido en modo corto: requiere integración completa")
	}

	svc, client, _, cleanup := setupTestProcessor(t)
	defer cleanup()

	ctx := context.Background()

	// recalibrar saldos a valores conocidos para el test
	// A=1000, B=50, C=0
	totalEsperado := decimal.NewFromInt(1050)

	balanceInicial, err := getTotalBalance(ctx, client, 1, 2, 3)
	if err != nil {
		t.Fatalf("error obteniendo balances iniciales: %v", err)
	}
	t.Logf("balance inicial total: %s", balanceInicial.String())

	// batería de transferencias
	transfers := []struct {
		sender   int
		receiver int
		amount   decimal.Decimal
		expectOK bool
	}{
		{1, 2, decimal.NewFromInt(100), true},   // OK: A→B 100
		{2, 3, decimal.NewFromInt(50), true},     // OK: B→C 50
		{2, 1, decimal.NewFromInt(200), false},   // FAIL: B sin fondos
		{1, 3, decimal.NewFromInt(150), true},     // OK: A→C 150
		{3, 1, decimal.NewFromInt(0), false},      // FAIL: monto 0
		{3, 3, decimal.NewFromInt(10), false},     // FAIL: self-transfer
		{1, 2, decimal.NewFromInt(50), true},      // OK: A→B 50
		{2, 2, decimal.NewFromInt(5), false},      // FAIL: self-transfer
	}

	for i, tr := range transfers {
		_, err := svc.Transfer(ctx, models.TransferRequest{
			SenderID:   tr.sender,
			ReceiverID: tr.receiver,
			Amount:     tr.amount,
		})

		if tr.expectOK && err != nil {
			t.Errorf("transferencia %d: se esperaba éxito, pero falló: %v", i+1, err)
		}
		if !tr.expectOK && err == nil {
			t.Errorf("transferencia %d: se esperaba fallo, pero fue éxito", i+1)
		}
	}

	balanceFinal, err := getTotalBalance(ctx, client, 1, 2, 3)
	if err != nil {
		t.Fatalf("error obteniendo balances finales: %v", err)
	}

	if !balanceFinal.Equal(totalEsperado) {
		t.Errorf("INVARIANTE DEL DINERO ROTO tras batería: esperado=%s, obtenido=%s", totalEsperado.String(), balanceFinal.String())
	}

	t.Logf("balance final total: %s (conservación verificada)", balanceFinal.String())

	// loggear balances individuales
	for _, id := range []int{1, 2, 3} {
		user, _ := client.GetUser(ctx, id)
		if user != nil {
			t.Logf("  usuario %d: %s %s", id, user.Name, user.Balance.String())
		}
	}
}

func envOrDefault(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		slog.Warn("variable de entorno", "clave", key, "valor", val)
		return val
	}
	return defaultVal
}
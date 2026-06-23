-- =====================================================================
-- NeoWallet — Inicialización: processor_db (PostgreSQL 15+)
-- =====================================================================
-- Base de datos PRIVADA del processor-service. Almacena el registro de
-- transferencias P2P y su máquina de estados (patrón Saga). El processor
-- NUNCA toca saldos directamente: lo hace vía HTTP contra accounts-service.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla: transactions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id              SERIAL         PRIMARY KEY,
    sender_id       INTEGER        NOT NULL,
    receiver_id     INTEGER        NOT NULL,
    amount          DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    status          VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    -- Clave de idempotencia (bonus): evita ejecutar 2 veces la misma
    -- transferencia si el cliente reintenta. UNIQUE garantiza unicidad.
    idempotency_key VARCHAR(80)    UNIQUE,
    error_message   TEXT,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),

    -- Estados válidos del patrón Saga (orquestación con compensación):
    --   PENDING      -> transacción creada, aún sin debitar
    --   DEBITED      -> dinero retirado del sender (paso 1 OK)
    --   COMPLETED    -> dinero acreditado al receiver (éxito total)
    --   FAILED       -> falló antes de mover dinero (sin efectos)
    --   ROLLED_BACK  -> falló el crédito; se compensó devolviendo al sender
    CONSTRAINT valid_status CHECK (status IN ('PENDING', 'DEBITED', 'COMPLETED', 'FAILED', 'ROLLED_BACK'))
);

CREATE INDEX IF NOT EXISTS idx_tx_sender   ON transactions (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_receiver ON transactions (receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_status   ON transactions (status);

-- Mantener updated_at al cambiar de estado (clave para reconciliación).
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tx_touch ON transactions;
CREATE TRIGGER trg_tx_touch
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

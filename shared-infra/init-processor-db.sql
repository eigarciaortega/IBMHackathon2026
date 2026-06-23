-- init-processor-db.sql
-- Esquema de la base de datos del procesador (processor_db)
-- Dueño exclusivo: processor-service

BEGIN;

CREATE TABLE IF NOT EXISTS transactions (
    id              SERIAL PRIMARY KEY,
    transaction_id  UUID NOT NULL UNIQUE,
    sender_id       INT NOT NULL,
    receiver_id     INT NOT NULL,
    amount          DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_status CHECK (status IN ('PENDING','DEBITED','COMPLETED','FAILED','ROLLED_BACK'))
);

CREATE INDEX IF NOT EXISTS idx_tx_sender ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_tx_receiver ON transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);

COMMIT;
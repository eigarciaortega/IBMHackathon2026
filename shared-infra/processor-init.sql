CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(30) NOT NULL,
    idempotency_key VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_transaction_status CHECK (
        status IN ('PENDING', 'DEBITED', 'COMPLETED', 'FAILED', 'ROLLED_BACK')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency_key
ON transactions (idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_set_updated_at ON transactions;
CREATE TRIGGER transactions_set_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

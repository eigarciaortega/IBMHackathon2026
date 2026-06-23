-- NeoWallet: Processor Service - Schema inicial
CREATE TABLE IF NOT EXISTS transactions (
    id            BIGSERIAL PRIMARY KEY,
    sender_id     BIGINT NOT NULL,
    receiver_id   BIGINT NOT NULL,
    amount        DECIMAL(10, 2) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_valid_status CHECK (
        status IN ('PENDING', 'DEBITED', 'COMPLETED', 'FAILED', 'ROLLED_BACK')
    ),
    CONSTRAINT chk_no_self_transfer CHECK (sender_id != receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_tx_sender   ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_tx_receiver ON transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_tx_status   ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_created  ON transactions(created_at DESC);

COMMENT ON TABLE transactions IS 'Registro de todas las transferencias P2P';
COMMENT ON COLUMN transactions.status IS 'PENDING→DEBITED→COMPLETED o PENDING→FAILED o DEBITED→ROLLED_BACK';

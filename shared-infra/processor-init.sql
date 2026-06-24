CREATE TABLE IF NOT EXISTS transactions (
                                            id BIGSERIAL PRIMARY KEY,
                                            sender_id BIGINT,
                                            receiver_id BIGINT,
                                            amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_transactions_amount_positive
    CHECK (amount > 0),

    CONSTRAINT chk_transactions_status
    CHECK (status IN ('PENDING', 'DEBITED', 'COMPLETED', 'FAILED', 'ROLLED_BACK'))
    );

CREATE INDEX IF NOT EXISTS idx_transactions_sender
    ON transactions(sender_id);

CREATE INDEX IF NOT EXISTS idx_transactions_receiver
    ON transactions(receiver_id);

CREATE INDEX IF NOT EXISTS idx_transactions_status
    ON transactions(status);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
    ON transactions(created_at);
CREATE TABLE transactions (
                              id SERIAL PRIMARY KEY,
                              sender_id INT NOT NULL,
                              receiver_id INT NOT NULL,
                              amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
                              status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                              error_message TEXT,
                              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                              CONSTRAINT valid_status CHECK (status IN ('PENDING', 'DEBITED', 'COMPLETED', 'FAILED', 'ROLLED_BACK'))
);
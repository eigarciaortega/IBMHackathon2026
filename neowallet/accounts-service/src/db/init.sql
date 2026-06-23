-- NeoWallet Accounts DB Schema

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data for local testing
INSERT INTO users (name, email, balance) VALUES
    ('Alice', 'alice@neowallet.com', 1000.00),
    ('Bob', 'bob@neowallet.com', 500.00),
    ('Carol', 'carol@neowallet.com', 250.00)
ON CONFLICT (email) DO NOTHING;

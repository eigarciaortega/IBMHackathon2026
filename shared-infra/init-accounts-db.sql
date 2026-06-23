-- init-accounts-db.sql
-- Esquema de la base de datos de cuentas (accounts_db)
-- Dueño exclusivo: accounts-service

BEGIN;

CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    balance     DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS balance_operations (
    id              SERIAL PRIMARY KEY,
    idempotency_key VARCHAR(120) UNIQUE NOT NULL,
    user_id         INT NOT NULL REFERENCES users(id),
    operation       VARCHAR(10) NOT NULL CHECK (operation IN ('debit','credit','recharge')),
    amount          DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    previous_balance DECIMAL(10,2) NOT NULL,
    new_balance     DECIMAL(10,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_balance_ops_user ON balance_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_ops_key ON balance_operations(idempotency_key);

-- Datos semilla reproducibles para demo y tests
INSERT INTO users (name, email, balance) VALUES
    ('Usuario A (Rico)',  'usuario.a@neowallet.com', 1000.00),
    ('Usuario B (Pobre)', 'usuario.b@neowallet.com',   50.00),
    ('Usuario C (Nuevo)', 'usuario.c@neowallet.com',    0.00)
ON CONFLICT (email) DO NOTHING;

COMMIT;
-- db-infra/init-accounts.sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos semilla (Seed Data)
INSERT INTO users (name, email, balance) VALUES 
('Usuario A (Rico)', 'usuario.a@neowallet.com', 1000.00),
('Usuario B (Pobre)', 'usuario.b@neowallet.com', 50.00),
('Usuario C (Nuevo)', 'usuario.c@neowallet.com', 0.00)
ON CONFLICT (email) DO NOTHING;
CREATE TABLE IF NOT EXISTS users (
                                     id BIGSERIAL PRIMARY KEY,
                                     name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_users_balance_non_negative
    CHECK (balance >= 0)
    );

INSERT INTO users (id, name, email, balance)
VALUES
    (1, 'Usuario A Rico', 'usuario.a@neowallet.com', 1000.00),
    (2, 'Usuario B Pobre', 'usuario.b@neowallet.com', 50.00),
    (3, 'Usuario C Nuevo', 'usuario.c@neowallet.com', 0.00)
    ON CONFLICT (email) DO NOTHING;

SELECT setval('users_id_seq', GREATEST((SELECT MAX(id) FROM users), 1));
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
                                     id BIGSERIAL PRIMARY KEY,
                                     name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_users_role
    CHECK (role IN ('ADMINISTRADOR', 'COLABORADOR'))
    );

INSERT INTO users (id, name, email, password, role, active)
VALUES
    (
        1,
        'Mario Juarez',
        'admin@corporativoalpha.com',
        crypt('Admin123', gen_salt('bf', 10)),
        'ADMINISTRADOR',
        TRUE
    ),
    (
        2,
        'Carlos Méndez',
        'carlos.mendez@corporativoalpha.com',
        crypt('User123', gen_salt('bf', 10)),
        'COLABORADOR',
        TRUE
    ),
    (
        3,
        'Ana Torres',
        'ana.torres@corporativoalpha.com',
        crypt('User123', gen_salt('bf', 10)),
        'COLABORADOR',
        TRUE
    )
    ON CONFLICT (email) DO NOTHING;

SELECT setval('users_id_seq', GREATEST((SELECT MAX(id) FROM users), 1));
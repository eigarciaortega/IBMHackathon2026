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

CREATE TABLE IF NOT EXISTS spaces (
                                      id BIGSERIAL PRIMARY KEY,
                                      name VARCHAR(120) NOT NULL,
    type VARCHAR(40) NOT NULL,
    capacity INT NOT NULL,
    floor INT NOT NULL,
    location VARCHAR(160) NOT NULL,
    has_projector BOOLEAN NOT NULL DEFAULT FALSE,
    has_air_conditioning BOOLEAN NOT NULL DEFAULT FALSE,
    has_whiteboard BOOLEAN NOT NULL DEFAULT FALSE,
    has_monitor BOOLEAN NOT NULL DEFAULT FALSE,
    other_resources VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_spaces_type
    CHECK (type IN ('SALA_JUNTAS', 'ESCRITORIO_INDIVIDUAL')),

    CONSTRAINT chk_spaces_status
    CHECK (status IN ('ACTIVO', 'INACTIVO')),

    CONSTRAINT chk_spaces_capacity
    CHECK (capacity > 0)
    );

CREATE TABLE IF NOT EXISTS bookings (
                                        id BIGSERIAL PRIMARY KEY,
                                        user_id BIGINT NOT NULL,
                                        space_id BIGINT NOT NULL,
                                        booking_date DATE NOT NULL,
                                        start_time TIME NOT NULL,
                                        end_time TIME NOT NULL,
                                        attendees INT NOT NULL,
                                        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id) REFERENCES users(id),

    CONSTRAINT fk_bookings_space
    FOREIGN KEY (space_id) REFERENCES spaces(id),

    CONSTRAINT chk_bookings_status
    CHECK (status IN ('ACTIVA', 'CANCELADA', 'FINALIZADA')),

    CONSTRAINT chk_bookings_attendees
    CHECK (attendees > 0),

    CONSTRAINT chk_bookings_time_range
    CHECK (end_time > start_time)
    );

CREATE INDEX IF NOT EXISTS idx_bookings_space_date_time
    ON bookings(space_id, booking_date, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_bookings_user
    ON bookings(user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_status
    ON bookings(status);

CREATE INDEX IF NOT EXISTS idx_spaces_type_capacity_status
    ON spaces(type, capacity, status);

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
    ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
                               password = EXCLUDED.password,
                               role = EXCLUDED.role,
                               active = EXCLUDED.active,
                               updated_at = CURRENT_TIMESTAMP;

INSERT INTO spaces (
    id,
    name,
    type,
    capacity,
    floor,
    location,
    has_projector,
    has_air_conditioning,
    has_whiteboard,
    has_monitor,
    other_resources,
    status
)
VALUES
    (
        101,
        'Sala Innovación',
        'SALA_JUNTAS',
        8,
        3,
        'Edificio A - Piso 3',
        TRUE,
        TRUE,
        TRUE,
        TRUE,
        'Sistema de videoconferencia',
        'ACTIVO'
    ),
    (
        102,
        'Sala Estrategia',
        'SALA_JUNTAS',
        12,
        4,
        'Edificio A - Piso 4',
        TRUE,
        TRUE,
        TRUE,
        TRUE,
        'Pantalla 75 pulgadas',
        'ACTIVO'
    ),
    (
        103,
        'Sala Creativa',
        'SALA_JUNTAS',
        6,
        2,
        'Edificio B - Piso 2',
        FALSE,
        TRUE,
        TRUE,
        TRUE,
        'Kit de lluvia de ideas',
        'ACTIVO'
    ),
    (
        201,
        'Hot Desk 201',
        'ESCRITORIO_INDIVIDUAL',
        1,
        2,
        'Open Space - Piso 2',
        FALSE,
        TRUE,
        FALSE,
        TRUE,
        'Conexión eléctrica y red',
        'ACTIVO'
    ),
    (
        202,
        'Hot Desk 202',
        'ESCRITORIO_INDIVIDUAL',
        1,
        2,
        'Open Space - Piso 2',
        FALSE,
        TRUE,
        FALSE,
        TRUE,
        'Conexión eléctrica y red',
        'ACTIVO'
    )
    ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
                            type = EXCLUDED.type,
                            capacity = EXCLUDED.capacity,
                            floor = EXCLUDED.floor,
                            location = EXCLUDED.location,
                            has_projector = EXCLUDED.has_projector,
                            has_air_conditioning = EXCLUDED.has_air_conditioning,
                            has_whiteboard = EXCLUDED.has_whiteboard,
                            has_monitor = EXCLUDED.has_monitor,
                            other_resources = EXCLUDED.other_resources,
                            status = EXCLUDED.status,
                            updated_at = CURRENT_TIMESTAMP;

SELECT setval(
               'users_id_seq',
               COALESCE((SELECT MAX(id) FROM users), 1),
               (SELECT COUNT(*) > 0 FROM users)
       );

SELECT setval(
               'spaces_id_seq',
               COALESCE((SELECT MAX(id) FROM spaces), 1),
               (SELECT COUNT(*) > 0 FROM spaces)
       );

SELECT setval(
               'bookings_id_seq',
               COALESCE((SELECT MAX(id) FROM bookings), 1),
               (SELECT COUNT(*) > 0 FROM bookings)
       );
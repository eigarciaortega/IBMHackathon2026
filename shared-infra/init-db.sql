CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('ADMINISTRADOR', 'COLABORADOR'))
);

CREATE TABLE IF NOT EXISTS spaces (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('SALA', 'DESK')),
    capacity INT NOT NULL CHECK (capacity > 0),
    has_projector BOOLEAN NOT NULL DEFAULT FALSE,
    has_air_conditioning BOOLEAN NOT NULL DEFAULT FALSE,
    floor_location VARCHAR(100) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    space_id BIGINT NOT NULL REFERENCES spaces(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    attendees INT NOT NULL CHECK (attendees > 0),
    status VARCHAR(30) NOT NULL CHECK (status IN ('ACTIVA', 'CANCELADA')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_booking_time CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_space_time
ON bookings(space_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_bookings_user
ON bookings(user_id);

INSERT INTO users (email, password, full_name, role) VALUES
('admin@corporativoalpha.com', 'Admin123', 'Administrador Corporativo Alpha', 'ADMINISTRADOR'),
('carlos.mendez@corporativoalpha.com', 'User123', 'Carlos Méndez', 'COLABORADOR'),
('ana.torres@corporativoalpha.com', 'User123', 'Ana Torres', 'COLABORADOR')
ON CONFLICT (email) DO NOTHING;

INSERT INTO spaces (name, type, capacity, has_projector, has_air_conditioning, floor_location, active) VALUES
('Sala Creativa', 'SALA', 8, TRUE, TRUE, 'Piso 1 - Ala Norte', TRUE),
('Sala Ejecutiva', 'SALA', 12, TRUE, TRUE, 'Piso 2 - Ala Sur', TRUE),
('Sala Sprint', 'SALA', 4, TRUE, FALSE, 'Piso 1 - Ala Este', TRUE),
('Escritorio Ventana 201', 'DESK', 1, FALSE, TRUE, 'Piso 2 - Zona Ventanas', TRUE),
('Escritorio Central 105', 'DESK', 1, FALSE, TRUE, 'Piso 1 - Zona Central', TRUE)
ON CONFLICT (name) DO NOTHING;

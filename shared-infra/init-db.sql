-- =============================================================================
-- OfficeSpace Database Initialization Script
-- PostgreSQL 15+
-- Run: psql -U officespace_user -d officespace_db -f init-db.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Clean slate (safe to re-run during development)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS spaces   CASCADE;
DROP TABLE IF EXISTS users    CASCADE;

DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS space_type;
DROP TYPE IF EXISTS booking_status;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
CREATE TYPE user_role      AS ENUM ('ADMIN', 'COLLABORATOR');
CREATE TYPE space_type     AS ENUM ('SALA', 'DESK');
CREATE TYPE booking_status AS ENUM ('ACTIVE', 'CANCELLED');

-- -----------------------------------------------------------------------------
-- Table: users
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          user_role    NOT NULL DEFAULT 'COLLABORATOR',
    full_name     VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Table: spaces
-- -----------------------------------------------------------------------------
CREATE TABLE spaces (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    type          space_type   NOT NULL,
    capacity      INTEGER      NOT NULL CHECK (capacity >= 1),
    floor         VARCHAR(50),
    has_projector BOOLEAN      NOT NULL DEFAULT FALSE,
    has_ac        BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Table: bookings
-- -----------------------------------------------------------------------------
CREATE TABLE bookings (
    id         SERIAL PRIMARY KEY,
    space_id   INTEGER        NOT NULL REFERENCES spaces(id) ON DELETE RESTRICT,
    user_id    INTEGER        NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
    start_time TIMESTAMPTZ    NOT NULL,
    end_time   TIMESTAMPTZ    NOT NULL,
    attendees  INTEGER        NOT NULL CHECK (attendees >= 1),
    status     booking_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    -- Database-level guarantee: end must always be after start
    CONSTRAINT chk_time_order CHECK (end_time > start_time)
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

-- Primary index for overlap detection queries.
-- Covers: WHERE space_id = $1 AND status = 'ACTIVE' AND start_time < $3 AND end_time > $2
-- Partial index (WHERE status = 'ACTIVE') reduces index size significantly
-- as cancelled bookings are never part of conflict checks.
CREATE INDEX idx_bookings_overlap
    ON bookings (space_id, start_time, end_time)
    WHERE status = 'ACTIVE';

-- Index for "my bookings" queries filtered by user
CREATE INDEX idx_bookings_user
    ON bookings (user_id, status);

-- Index for admin dashboard today's occupancy
CREATE INDEX idx_bookings_today
    ON bookings (start_time, status);

-- -----------------------------------------------------------------------------
-- Seed Data: Users
-- Password hashes generated with bcrypt, saltRounds = 10
--
-- Admin123  -> $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- User123   -> $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
--
-- NOTE: These are placeholder hashes. The booking-service seed script
-- generates real hashes on first run. See shared-infra/scripts/seed.js
-- -----------------------------------------------------------------------------
INSERT INTO users (email, password_hash, role, full_name) VALUES
(
    'admin@corporativoalpha.com',
    '$2b$10$rQnUz9FBaqYFnBbgLqxFAOjWGYDEBp0k7ZZqQXgxLMxaOzqF5GQZy',
    'ADMIN',
    'Administrador Sistema'
),
(
    'carlos.mendez@corporativoalpha.com',
    '$2b$10$rQnUz9FBaqYFnBbgLqxFAOjWGYDEBp0k7ZZqQXgxLMxaOzqF5GQZy',
    'COLLABORATOR',
    'Carlos Mendez'
),
(
    'ana.torres@corporativoalpha.com',
    '$2b$10$rQnUz9FBaqYFnBbgLqxFAOjWGYDEBp0k7ZZqQXgxLMxaOzqF5GQZy',
    'COLLABORATOR',
    'Ana Torres'
);

-- -----------------------------------------------------------------------------
-- Seed Data: Spaces
-- -----------------------------------------------------------------------------
INSERT INTO spaces (name, type, capacity, floor, has_projector, has_ac) VALUES
('Sala Creativa',        'SALA', 8,  'Piso 1', TRUE,  TRUE),
('Sala Ejecutiva',       'SALA', 12, 'Piso 2', TRUE,  TRUE),
('Sala Pequeña A',       'SALA', 4,  'Piso 1', FALSE, TRUE),
('Sala Pequeña B',       'SALA', 4,  'Piso 1', FALSE, FALSE),
('Sala de Capacitación', 'SALA', 20, 'Piso 3', TRUE,  TRUE),
('Escritorio Ventana 1', 'DESK', 1,  'Piso 1', FALSE, TRUE),
('Escritorio Ventana 2', 'DESK', 1,  'Piso 1', FALSE, TRUE),
('Escritorio Central 1', 'DESK', 1,  'Piso 2', FALSE, FALSE),
('Escritorio Central 2', 'DESK', 1,  'Piso 2', FALSE, FALSE),
('Escritorio Silencioso','DESK', 1,  'Piso 3', FALSE, TRUE);

-- -----------------------------------------------------------------------------
-- Verification queries (commented out, uncomment to debug after running)
-- -----------------------------------------------------------------------------
-- SELECT id, email, role FROM users;
-- SELECT id, name, type, capacity FROM spaces;
-- SELECT COUNT(*) FROM bookings;

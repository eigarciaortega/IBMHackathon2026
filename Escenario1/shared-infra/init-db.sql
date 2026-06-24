-- ===========================================================
-- OFFICESPACE - Script de inicialización de la Base de Datos
-- ===========================================================

-- USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(100) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    perfil     VARCHAR(20) NOT NULL CHECK (perfil IN ('ADMINISTRADOR', 'COLABORADOR')),
    nombre     VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ESPACIOS
CREATE TABLE IF NOT EXISTS espacios (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('SALA', 'DESK')),
    capacidad       INT NOT NULL CHECK (capacidad > 0),
    piso            VARCHAR(50),
    con_proyector   BOOLEAN DEFAULT FALSE,
    con_aire        BOOLEAN DEFAULT FALSE,
    con_pizarron    BOOLEAN DEFAULT FALSE,
    con_tv          BOOLEAN DEFAULT FALSE,
    con_refrigerador BOOLEAN DEFAULT FALSE,
    disponible      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- RESERVACIONES
CREATE TABLE IF NOT EXISTS reservaciones (
    id                SERIAL PRIMARY KEY,
    espacio_id        INT NOT NULL REFERENCES espacios(id) ON DELETE CASCADE,
    usuario_id        INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    hora_entrada      TIMESTAMP NOT NULL,
    hora_salida       TIMESTAMP NOT NULL,
    asistentes        INT NOT NULL CHECK (asistentes > 0),
    requiere_refrigerador BOOLEAN DEFAULT FALSE,
    status            VARCHAR(20) DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED', 'PENDING')),
    created_at        TIMESTAMP DEFAULT NOW(),
    CONSTRAINT no_end_before_start CHECK (hora_salida > hora_entrada)
);

-- =============================================
-- Data inicial
-- =============================================

INSERT INTO usuarios (email, contrasena, perfil, nombre) VALUES
    ('admin@corporativoalpha.com',         'Admin123', 'ADMINISTRADOR', 'Administrador'),
    ('carlos.mendez@corporativoalpha.com', 'User123',  'COLABORADOR',   'Carlos Méndez'),
    ('ana.torres@corporativoalpha.com',    'User123',  'COLABORADOR',   'Ana Torres');

INSERT INTO espacios (nombre, tipo, capacidad, piso, con_proyector, con_aire, con_pizarron, con_tv, con_refrigerador) VALUES
    ('Sala Creativa',      'SALA', 8,  'Piso 2', TRUE,  TRUE,  TRUE,  FALSE, FALSE),
    ('Sala Ejecutiva',     'SALA', 12, 'Piso 3', TRUE,  TRUE,  FALSE, FALSE, FALSE),
    ('Sala Pequeña A',     'SALA', 4,  'Piso 1', FALSE, TRUE,  TRUE,  TRUE,  FALSE),
    ('Escritorio Ventana', 'DESK', 1,  'Piso 2', FALSE, TRUE,  FALSE, FALSE, FALSE),
    ('Escritorio Central', 'DESK', 1,  'Piso 1', FALSE, TRUE,  FALSE, FALSE, FALSE),
    ('Escritorio Comun',   'DESK', 1,  'Piso 1', FALSE, TRUE,  FALSE, FALSE, FALSE),
    ('Sala de Cómputo',    'SALA', 6,  'Piso 2', TRUE,  TRUE,  FALSE, FALSE, FALSE),
    ('Sala de Lactancia',  'SALA', 1,  'Piso 2', FALSE, TRUE,  FALSE, TRUE,  TRUE);

-- Made with Bob

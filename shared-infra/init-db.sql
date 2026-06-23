-- =====================================================================
-- OfficeSpace — Esquema, índices, restricciones y semilla
-- Fuente ÚNICA de verdad del modelo de datos (regla de arranque del proyecto).
-- PostgreSQL lo ejecuta una sola vez, al inicializar el contenedor con el
-- volumen de datos vacío (/docker-entrypoint-initdb.d). No se usan herramientas
-- de migración por servicio: tres servicios migrando la misma base generan
-- condiciones de carrera al arrancar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------
-- btree_gist permite combinar igualdad de enteros (espacio_id WITH =) con el
-- operador de solapamiento de rangos (&&) en una misma restricción de exclusión.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------
-- Tabla: usuarios
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id            SERIAL PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,                 -- hash bcrypt, nunca texto plano
    rol           TEXT NOT NULL CHECK (rol IN ('ADMINISTRADOR', 'COLABORADOR')),
    nombre        TEXT NOT NULL,
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Tabla: espacios
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS espacios (
    id              SERIAL PRIMARY KEY,
    nombre          TEXT NOT NULL,
    tipo            TEXT NOT NULL CHECK (tipo IN ('SALA', 'DESK')),
    capacidad       INT  NOT NULL CHECK (capacidad > 0),
    tiene_proyector BOOLEAN NOT NULL DEFAULT FALSE,
    tiene_aire      BOOLEAN NOT NULL DEFAULT FALSE,
    piso            TEXT NOT NULL DEFAULT '',
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Tabla: reservas
-- ---------------------------------------------------------------------
-- Las FKs se mantienen por integridad referencial de la base compartida
-- (evitan reservas que apunten a un espacio o usuario inexistente). La lógica
-- de negocio (capacidad, existencia) la valida booking-service por HTTP contra
-- catalog-service; la FK NO sustituye esa validación, solo blinda la integridad.
CREATE TABLE IF NOT EXISTS reservas (
    id            SERIAL PRIMARY KEY,
    espacio_id    INT  NOT NULL REFERENCES espacios(id) ON DELETE CASCADE,
    usuario_email TEXT NOT NULL REFERENCES usuarios(email) ON UPDATE CASCADE,
    fecha         DATE NOT NULL,
    hora_inicio   TIME NOT NULL,
    hora_fin      TIME NOT NULL,
    asistentes    INT  NOT NULL CHECK (asistentes > 0),
    estado        TEXT NOT NULL DEFAULT 'CONFIRMADA'
                       CHECK (estado IN ('CONFIRMADA', 'CANCELADA')),
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Consistencia temporal garantizada también a nivel de base.
    CONSTRAINT reservas_horario_valido CHECK (hora_fin > hora_inicio)
);

-- ---------------------------------------------------------------------
-- Garantía anti-solapamiento a nivel de base de datos (criterio diferenciador)
-- ---------------------------------------------------------------------
-- La validación en la app (consultar y luego insertar) sufre una condición de
-- carrera: dos peticiones simultáneas para el mismo intervalo pueden pasar ambas
-- el chequeo. Esta restricción de exclusión la garantiza atómicamente el motor.
--   * Rango '[)' (inferior inclusivo, superior exclusivo): implementa la regla de
--     límites exclusivos → 10:00-11:00 y 11:00-12:00 NO se solapan.
--   * WHERE (estado = 'CONFIRMADA'): restricción parcial → las reservas canceladas
--     dejan de bloquear el horario.
ALTER TABLE reservas ADD CONSTRAINT reservas_sin_solapamiento
EXCLUDE USING gist (
    espacio_id WITH =,
    tsrange( (fecha + hora_inicio), (fecha + hora_fin), '[)' ) WITH &&
) WHERE (estado = 'CONFIRMADA');

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
-- Acelera la verificación de disponibilidad/solapamiento por espacio y fecha.
CREATE INDEX IF NOT EXISTS idx_reservas_espacio_fecha ON reservas (espacio_id, fecha);
-- Acelera "Mis Reservas" (filtra por usuario autenticado).
CREATE INDEX IF NOT EXISTS idx_reservas_usuario ON reservas (usuario_email);

-- =====================================================================
-- SEMILLA
-- =====================================================================

-- --- Usuarios (contraseñas hasheadas con bcrypt, costo 10) ---
--   admin@corporativoalpha.com         / Admin123 / ADMINISTRADOR
--   carlos.mendez@corporativoalpha.com / User123  / COLABORADOR
--   ana.torres@corporativoalpha.com    / User123  / COLABORADOR
INSERT INTO usuarios (email, password_hash, rol, nombre) VALUES
    ('admin@corporativoalpha.com',         '$2a$10$qSHCkFOse/ObOI/WI1M9EObPpKk3aafmggh3QFHuneuam3xnmHS.G', 'ADMINISTRADOR', 'Administrador Alpha'),
    ('carlos.mendez@corporativoalpha.com', '$2a$10$5XF7pV.M69Orzk8s6PLmT.xIiQElCtDogF/D9EoQxU4YFjav6eslK', 'COLABORADOR',  'Carlos Méndez'),
    ('ana.torres@corporativoalpha.com',    '$2a$10$pjdklVehA68ECs1UfjbcUeSMwv.CwAqzXMTrwXct3Vp5zu0XPUqhu', 'COLABORADOR',  'Ana Torres')
ON CONFLICT (email) DO NOTHING;

-- --- Espacios ---
INSERT INTO espacios (nombre, tipo, capacidad, tiene_proyector, tiene_aire, piso) VALUES
    ('Sala Monterrey', 'SALA', 8, TRUE,  TRUE,  'Piso 1'),
    ('Sala Cancún',    'SALA', 4, FALSE, TRUE,  'Piso 2'),
    ('Sala Oaxaca',    'SALA', 12, TRUE, TRUE,  'Piso 3'),
    ('Desk A1',        'DESK', 1, FALSE, FALSE, 'Piso 1'),
    ('Desk A2',        'DESK', 1, FALSE, TRUE,  'Piso 1'),
    ('Desk B1',        'DESK', 1, FALSE, FALSE, 'Piso 2')
ON CONFLICT DO NOTHING;

-- --- Reservas de ejemplo (fechas RELATIVAS a CURRENT_DATE) ---
-- Se referencian los espacios por nombre (no por id fijo) para no depender del
-- valor de la secuencia y mantener la semilla robusta.

-- (1) CONFLICTO PREPARADO PARA LA DEMO: Sala Monterrey, MAÑANA 09:00-10:00.
--     Intentar reservar encima de este horario debe devolver 409.
INSERT INTO reservas (espacio_id, usuario_email, fecha, hora_inicio, hora_fin, asistentes, estado)
SELECT e.id, 'carlos.mendez@corporativoalpha.com', CURRENT_DATE + 1, '09:00', '10:00', 5, 'CONFIRMADA'
FROM espacios e WHERE e.nombre = 'Sala Monterrey';

-- (2) Reserva CONSECUTIVA en el mismo espacio (10:00-11:00): demuestra que los
--     límites exclusivos permiten reservas pegadas sin marcar solapamiento.
INSERT INTO reservas (espacio_id, usuario_email, fecha, hora_inicio, hora_fin, asistentes, estado)
SELECT e.id, 'ana.torres@corporativoalpha.com', CURRENT_DATE + 1, '10:00', '11:00', 3, 'CONFIRMADA'
FROM espacios e WHERE e.nombre = 'Sala Monterrey';

-- (3) y (4) Ocupación de HOY: alimentan el dashboard de ocupación del admin.
INSERT INTO reservas (espacio_id, usuario_email, fecha, hora_inicio, hora_fin, asistentes, estado)
SELECT e.id, 'carlos.mendez@corporativoalpha.com', CURRENT_DATE, '09:00', '13:00', 1, 'CONFIRMADA'
FROM espacios e WHERE e.nombre = 'Desk A1';

INSERT INTO reservas (espacio_id, usuario_email, fecha, hora_inicio, hora_fin, asistentes, estado)
SELECT e.id, 'ana.torres@corporativoalpha.com', CURRENT_DATE, '14:00', '15:00', 2, 'CONFIRMADA'
FROM espacios e WHERE e.nombre = 'Sala Cancún';

-- (5) Reserva CANCELADA: demuestra que el estado 'CANCELADA' libera el horario
--     (la restricción de exclusión es parcial y no la considera).
INSERT INTO reservas (espacio_id, usuario_email, fecha, hora_inicio, hora_fin, asistentes, estado)
SELECT e.id, 'carlos.mendez@corporativoalpha.com', CURRENT_DATE + 2, '09:00', '10:00', 4, 'CANCELADA'
FROM espacios e WHERE e.nombre = 'Sala Monterrey';

-- =====================================================================
-- IBM OfficeSpace — Inicialización de Base de Datos (PostgreSQL 15+)
-- =====================================================================
-- Base de datos COMPARTIDA por los microservicios:
--   auth-service · catalog-service · booking-service
--
-- Este script crea el esquema, las restricciones de integridad y los
-- datos semilla (usuarios de prueba y espacios). Se ejecuta una sola vez
-- al levantar el contenedor de Postgres (docker-entrypoint-initdb.d).
-- =====================================================================

-- Extensión necesaria para la restricción anti-solapamiento a nivel BD.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------
-- Tabla: users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    full_name     VARCHAR(120)  NOT NULL,
    email         VARCHAR(160)  NOT NULL UNIQUE,
    password_hash VARCHAR(120)  NOT NULL,
    role          VARCHAR(20)   NOT NULL
                  CHECK (role IN ('ADMINISTRADOR', 'COLABORADOR')),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Tabla: spaces  (salas de juntas / escritorios "hot desk")
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spaces (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(120) NOT NULL,
    type                VARCHAR(20)  NOT NULL
                        CHECK (type IN ('SALA', 'ESCRITORIO')),
    capacity            INTEGER      NOT NULL CHECK (capacity > 0),
    floor               VARCHAR(40)  NOT NULL,
    location            VARCHAR(120),
    has_projector       BOOLEAN      NOT NULL DEFAULT false,
    has_ac              BOOLEAN      NOT NULL DEFAULT false,
    has_videoconference BOOLEAN      NOT NULL DEFAULT false,
    active              BOOLEAN      NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Tabla: bookings  (reservas)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id           SERIAL PRIMARY KEY,
    space_id     INTEGER     NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id      INTEGER     NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    title        VARCHAR(160) NOT NULL DEFAULT 'Reserva',
    booking_date DATE        NOT NULL,
    start_time   TIME        NOT NULL,
    end_time     TIME        NOT NULL,
    attendees    INTEGER     NOT NULL CHECK (attendees > 0),
    status       VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADA'
                 CHECK (status IN ('CONFIRMADA', 'CANCELADA')),
    -- Id del evento espejo en Google Calendar (null si la sync no está activa).
    google_event_id TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Consistencia temporal: la hora de fin debe ser mayor que la de inicio.
    CONSTRAINT chk_time_order CHECK (end_time > start_time)
);

-- ---------------------------------------------------------------------
-- Tabla: booking_reminders  (recordatorios automatizados)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_reminders (
    booking_id              INTEGER PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
    reminder_at             TIMESTAMPTZ NOT NULL,
    lead_minutes            INTEGER     NOT NULL DEFAULT 60 CHECK (lead_minutes >= 0),
    channels                TEXT[]      NOT NULL DEFAULT ARRAY['EMAIL','GOOGLE_CALENDAR']::TEXT[],
    email_to                VARCHAR(160),
    whatsapp_to             VARCHAR(40),
    google_calendar_url     TEXT,
    outlook_calendar_url    TEXT,
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'PARTIAL', 'FAILED', 'CANCELLED')),
    email_status            VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (email_status IN ('PENDING', 'SENT', 'FAILED', 'NOT_CONFIGURED', 'SKIPPED')),
    whatsapp_status         VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (whatsapp_status IN ('PENDING', 'SENT', 'FAILED', 'NOT_CONFIGURED', 'SKIPPED')),
    google_calendar_status   VARCHAR(20) NOT NULL DEFAULT 'SENT'
                            CHECK (google_calendar_status IN ('PENDING', 'SENT', 'FAILED', 'NOT_CONFIGURED', 'SKIPPED')),
    attempts                INTEGER     NOT NULL DEFAULT 0,
    last_attempt_at         TIMESTAMPTZ,
    sent_at                 TIMESTAMPTZ,
    last_error              TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- REGLA CRÍTICA (a nivel de base de datos): NO SOLAPAMIENTO
-- ---------------------------------------------------------------------
-- Garantía definitiva contra reservas encimadas, incluso ante condiciones
-- de carrera concurrentes. Usa un rango de tiempo '[inicio, fin)':
--   · Límite inferior inclusivo, superior exclusivo.
--   · Por tanto 10:00–11:00 y 11:00–12:00 NO se consideran solapadas.
-- Solo aplica a reservas CONFIRMADAS (las canceladas liberan el espacio).
ALTER TABLE bookings
  ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (
    space_id WITH =,
    tsrange(
      (booking_date + start_time),
      (booking_date + end_time)
    ) WITH &&
  ) WHERE (status = 'CONFIRMADA');

-- Índices de apoyo para búsquedas de disponibilidad.
CREATE INDEX IF NOT EXISTS idx_bookings_space_date ON bookings (space_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user       ON bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_spaces_type         ON spaces (type);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_status_at ON booking_reminders (status, reminder_at);

-- =====================================================================
-- DATOS SEMILLA
-- =====================================================================

-- Usuarios semilla (contraseñas con hash bcrypt).
INSERT INTO users (full_name, email, password_hash, role) VALUES
  ('Administrador IBM', 'admin@corporativoalpha.com',
   '$2b$10$NKGO5dm.4Arg.HRRfDSueOYT4F3rc0C9RNVtqTm1EqsnaeaN9kWcK', 'ADMINISTRADOR'),
  ('Carlos Méndez', 'carlos.mendez@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Ana Torres', 'ana.torres@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Joseph Trejo H.', 'jtrejoh2300@alumno.ipn.mx',
   '$2b$10$NKGO5dm.4Arg.HRRfDSueOYT4F3rc0C9RNVtqTm1EqsnaeaN9kWcK', 'ADMINISTRADOR'),
  ('Joseph Trejo Hernandez', 'josephtrejohernandez@gmail.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Alex Rivera - Boleta 20260001', 'boleta20260001@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Brenda Soto - Boleta 20260002', 'boleta20260002@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Cesar Luna - Boleta 20260003', 'boleta20260003@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Diana Vega - Boleta 20260004', 'boleta20260004@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Eduardo Mora - Boleta 20260005', 'boleta20260005@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Fernanda Rios - Boleta 20260006', 'boleta20260006@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Gabriel Diaz - Boleta 20260007', 'boleta20260007@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Helena Cruz - Boleta 20260008', 'boleta20260008@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Ivan Ortega - Boleta 20260009', 'boleta20260009@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Julia Navarro - Boleta 20260010', 'boleta20260010@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Kevin Flores - Boleta 20260011', 'boleta20260011@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Laura Campos - Boleta 20260012', 'boleta20260012@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Mateo Salas - Boleta 20260013', 'boleta20260013@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Natalia Ponce - Boleta 20260014', 'boleta20260014@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Oscar Reyes - Boleta 20260015', 'boleta20260015@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Paula Marin - Boleta 20260016', 'boleta20260016@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Ricardo Leon - Boleta 20260017', 'boleta20260017@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Sofia Bravo - Boleta 20260018', 'boleta20260018@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Tomas Aguilar - Boleta 20260019', 'boleta20260019@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Valeria Silva - Boleta 20260020', 'boleta20260020@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Andres Molina - Boleta 20260021', 'boleta20260021@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Camila Fuentes - Boleta 20260022', 'boleta20260022@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Diego Ibarra - Boleta 20260023', 'boleta20260023@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Elena Vargas - Boleta 20260024', 'boleta20260024@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Felipe Robles - Boleta 20260025', 'boleta20260025@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Giselle Santos - Boleta 20260026', 'boleta20260026@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Hector Mejia - Boleta 20260027', 'boleta20260027@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Isabel Franco - Boleta 20260028', 'boleta20260028@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Javier Nunez - Boleta 20260029', 'boleta20260029@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Karla Cardenas - Boleta 20260030', 'boleta20260030@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Leonardo Paredes - Boleta 20260031', 'boleta20260031@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Mariana Lozano - Boleta 20260032', 'boleta20260032@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Nicolas Vidal - Boleta 20260033', 'boleta20260033@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Olivia Herrera - Boleta 20260034', 'boleta20260034@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Pablo Trevino - Boleta 20260035', 'boleta20260035@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Regina Solis - Boleta 20260036', 'boleta20260036@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Samuel Escobar - Boleta 20260037', 'boleta20260037@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Teresa Galvan - Boleta 20260038', 'boleta20260038@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Uriel Bautista - Boleta 20260039', 'boleta20260039@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Victoria Roman - Boleta 20260040', 'boleta20260040@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Walter Medina - Boleta 20260041', 'boleta20260041@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Ximena Carrillo - Boleta 20260042', 'boleta20260042@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Yahir Padilla - Boleta 20260043', 'boleta20260043@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Zaira Beltran - Boleta 20260044', 'boleta20260044@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Adrian Montoya - Boleta 20260045', 'boleta20260045@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Bianca Orozco - Boleta 20260046', 'boleta20260046@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Cristian Valdez - Boleta 20260047', 'boleta20260047@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Daniela Pineda - Boleta 20260048', 'boleta20260048@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Emilio Salazar - Boleta 20260049', 'boleta20260049@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR'),
  ('Fabiola Quintana - Boleta 20260050', 'boleta20260050@corporativoalpha.com',
   '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 'COLABORADOR')
ON CONFLICT (email) DO NOTHING;

-- Espacios (nomenclatura inspirada en tecnología IBM).
INSERT INTO spaces (name, type, capacity, floor, location, has_projector, has_ac, has_videoconference) VALUES
  ('Sala Watson',        'SALA',       12, 'Piso 3', 'Ala Norte',  true,  true,  true),
  ('Sala Turing',        'SALA',        8, 'Piso 3', 'Ala Sur',    true,  true,  false),
  ('Sala Lovelace',      'SALA',        6, 'Piso 4', 'Ala Este',   false, true,  true),
  ('Sala Hopper',        'SALA',       20, 'Piso 5', 'Auditorio',  true,  true,  true),
  ('Sala Carbon',        'SALA',        4, 'Piso 4', 'Ala Oeste',  false, true,  false),
  ('Sala Db2',           'SALA',       10, 'Piso 5', 'Ala Norte',  true,  true,  true),
  ('Escritorio Quantum 01', 'ESCRITORIO', 1, 'Piso 2', 'Open Space A', false, true,  false),
  ('Escritorio Quantum 02', 'ESCRITORIO', 1, 'Piso 2', 'Open Space A', false, true,  false),
  ('Escritorio Granite 11', 'ESCRITORIO', 1, 'Piso 6', 'Open Space B', false, false, false),
  ('Escritorio Granite 12', 'ESCRITORIO', 1, 'Piso 6', 'Open Space B', false, true,  false)
ON CONFLICT DO NOTHING;

-- Reservas de ejemplo para HOY (para que el dashboard muestre ocupación).
-- Se insertan solo si aún no existen reservas, para no chocar con la
-- restricción de no-solapamiento al re-ejecutar.
INSERT INTO bookings (space_id, user_id, title, booking_date, start_time, end_time, attendees)
SELECT * FROM (VALUES
  (1, 2, 'Daily de Equipo Cloud',      CURRENT_DATE, TIME '09:00', TIME '10:00', 6),
  (1, 3, 'Revisión de Arquitectura',   CURRENT_DATE, TIME '11:00', TIME '12:30', 8),
  (2, 2, 'Entrevista Técnica',         CURRENT_DATE, TIME '10:00', TIME '11:00', 3),
  (4, 3, 'All-Hands Trimestral',       CURRENT_DATE, TIME '15:00', TIME '17:00', 18),
  (7, 2, 'Trabajo Focus',              CURRENT_DATE, TIME '09:00', TIME '13:00', 1)
) AS seed(space_id, user_id, title, booking_date, start_time, end_time, attendees)
WHERE NOT EXISTS (SELECT 1 FROM bookings);

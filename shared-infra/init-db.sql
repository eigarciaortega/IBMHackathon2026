CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('ADMINISTRADOR', 'COLABORADOR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('SALA', 'DESK')),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  floor VARCHAR(40) NOT NULL,
  has_projector BOOLEAN NOT NULL DEFAULT FALSE,
  has_ac BOOLEAN NOT NULL DEFAULT FALSE,
  has_screen BOOLEAN NOT NULL DEFAULT FALSE,
  has_whiteboard BOOLEAN NOT NULL DEFAULT FALSE,
  is_quiet_zone BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id),
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  attendees INTEGER NOT NULL CHECK (attendees > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bookings_valid_time_range CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS assistant_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  query_text TEXT NOT NULL,
  intent VARCHAR(60) NOT NULL DEFAULT 'BUSCAR_ESPACIO',
  detected_type VARCHAR(20),
  detected_capacity INTEGER,
  detected_date DATE,
  detected_time_preference VARCHAR(30),
  detected_resources TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_space_time
  ON bookings (space_id, date, start_time, end_time)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_bookings_user
  ON bookings (user_id, date ASC, start_time ASC);

CREATE INDEX IF NOT EXISTS idx_assistant_logs_created_at
  ON assistant_logs (created_at DESC);

INSERT INTO users (email, password_hash, full_name, role)
VALUES
  ('admin@corporativoalpha.com', crypt('Admin123', gen_salt('bf')), 'Admin Corporativo Alpha', 'ADMINISTRADOR'),
  ('carlos.mendez@corporativoalpha.com', crypt('User123', gen_salt('bf')), 'Carlos Mendez', 'COLABORADOR'),
  ('ana.torres@corporativoalpha.com', crypt('User123', gen_salt('bf')), 'Ana Torres', 'COLABORADOR')
ON CONFLICT (email) DO NOTHING;

INSERT INTO spaces (
  name,
  type,
  capacity,
  floor,
  has_projector,
  has_ac,
  has_screen,
  has_whiteboard,
  is_quiet_zone,
  description
)
VALUES
  (
    'Sala Creativa',
    'SALA',
    6,
    'Piso 3',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    'Sala flexible para sesiones de ideacion, workshops cortos y reuniones de equipo.'
  ),
  (
    'Sala Ejecutiva',
    'SALA',
    10,
    'Piso 5',
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    TRUE,
    'Espacio formal para juntas ejecutivas, comites y reuniones con clientes.'
  ),
  (
    'Sala de Entrevistas',
    'SALA',
    3,
    'Piso 2',
    FALSE,
    TRUE,
    TRUE,
    FALSE,
    TRUE,
    'Sala privada y silenciosa para entrevistas, feedback y conversaciones uno a uno.'
  ),
  (
    'Sala de Capacitacion',
    'SALA',
    18,
    'Piso 4',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    'Sala amplia para entrenamientos, onboarding y sesiones de aprendizaje.'
  ),
  (
    'Sala de Conferencias',
    'SALA',
    24,
    'Piso 6',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    'Sala premium para conferencias, town halls pequenos y presentaciones importantes.'
  ),
  (
    'Hot Desk Ventana',
    'DESK',
    1,
    'Piso 3',
    FALSE,
    TRUE,
    FALSE,
    FALSE,
    TRUE,
    'Escritorio individual con luz natural para trabajo concentrado.'
  ),
  (
    'Hot Desk Individual',
    'DESK',
    1,
    'Piso 2',
    FALSE,
    TRUE,
    FALSE,
    FALSE,
    TRUE,
    'Desk practico para colaboradores que necesitan una estacion por algunas horas.'
  ),
  (
    'Espacio Colaborativo',
    'DESK',
    8,
    'Piso 1',
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    'Area abierta para co-creacion, trabajo entre equipos y reuniones informales.'
  )
ON CONFLICT DO NOTHING;

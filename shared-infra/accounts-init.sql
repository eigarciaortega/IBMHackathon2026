-- =====================================================================
-- NeoWallet — Inicialización: accounts_db (PostgreSQL 15+)
-- =====================================================================
-- Base de datos PRIVADA del accounts-service (patrón DB per Service).
-- Contiene a los usuarios y su saldo, más un LIBRO MAYOR (ledger) que
-- audita cada movimiento monetario (requisito RNF-006: "Logs de auditoría
-- para todas las operaciones monetarias").
-- Se ejecuta una sola vez al crear el contenedor (docker-entrypoint-initdb.d).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla: users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL         PRIMARY KEY,
    name          VARCHAR(100)   NOT NULL,
    email         VARCHAR(100)   NOT NULL UNIQUE,
    phone         VARCHAR(20),                                -- para confirmaciones por SMS
    password_hash VARCHAR(120),                               -- bcrypt (login real)
    balance       DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now()
);
-- Compatibilidad si el volumen ya existía sin la columna.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(120);

-- ---------------------------------------------------------------------
-- Tabla: balance_ledger  (libro mayor / auditoría de dinero)
-- ---------------------------------------------------------------------
-- Cada fila es un asiento inmutable: deja rastro de TODO movimiento de
-- saldo (recarga, débito o crédito) con el saldo antes y después. Permite
-- demostrar la conservación del dinero y reconstruir cualquier balance.
CREATE TABLE IF NOT EXISTS balance_ledger (
    id             SERIAL         PRIMARY KEY,
    user_id        INTEGER        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation      VARCHAR(10)    NOT NULL CHECK (operation IN ('recharge', 'debit', 'credit')),
    amount         DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    balance_before DECIMAL(10, 2) NOT NULL,
    balance_after  DECIMAL(10, 2) NOT NULL,
    reference      VARCHAR(120),                              -- p.ej. "transfer:42" o "recharge:CREDIT_CARD"
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_user ON balance_ledger (user_id, created_at DESC);

-- Trigger ligero para mantener updated_at al modificar el saldo.
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_touch ON users;
CREATE TRIGGER trg_users_touch
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- =====================================================================
-- DATOS SEMILLA
-- =====================================================================
-- Los 3 primeros respetan EXACTAMENTE los casos de uso del documento
-- (Usuario A id=1, Usuario B id=2, Usuario C id=3). El 4º es una cuenta
-- personal para demostrar correos/SMS reales si configuras credenciales.
-- Todos comparten la contraseña DEMO: "Demo1234!" (hash bcrypt abajo).
INSERT INTO users (name, email, phone, password_hash, balance) VALUES
  ('Usuario A (Rico)',  'usuario.a@neowallet.com',        '+52 1 55 5555 0001', '$2a$10$LIiGtsmZ1z4cjHd6xICAdu/Kj7RiHGCwej.MLU.wvmISD2YEFCSbe', 1000.00),
  ('Usuario B (Pobre)', 'usuario.b@neowallet.com',        '+52 1 55 5555 0002', '$2a$10$LIiGtsmZ1z4cjHd6xICAdu/Kj7RiHGCwej.MLU.wvmISD2YEFCSbe',   50.00),
  ('Usuario C (Nuevo)', 'usuario.c@neowallet.com',        '+52 1 55 5555 0003', '$2a$10$LIiGtsmZ1z4cjHd6xICAdu/Kj7RiHGCwej.MLU.wvmISD2YEFCSbe',    0.00),
  ('Joseph Trejo',      'josephtrejohernandez@gmail.com', '+52 1 55 5555 0004', '$2a$10$LIiGtsmZ1z4cjHd6xICAdu/Kj7RiHGCwej.MLU.wvmISD2YEFCSbe',  500.00)
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------
-- Usuarios provenientes de Escenario 1 (mismos nombres/correos y MISMAS
-- contraseñas: se reutilizan sus hashes bcrypt originales). Sin teléfono
-- (Escenario 1 no lo tenía); se les asigna un saldo inicial para la demo.
-- ---------------------------------------------------------------------
INSERT INTO users (name, email, phone, password_hash, balance) VALUES
  ('Administrador IBM', 'admin@corporativoalpha.com',         NULL, '$2b$10$NKGO5dm.4Arg.HRRfDSueOYT4F3rc0C9RNVtqTm1EqsnaeaN9kWcK', 5000.00),
  ('Carlos Méndez',     'carlos.mendez@corporativoalpha.com', NULL, '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 1200.00),
  ('Ana Torres',        'ana.torres@corporativoalpha.com',    NULL, '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2',  800.00),
  ('Joseph Trejo H.',   'jtrejoh2300@alumno.ipn.mx',          NULL, '$2b$10$NKGO5dm.4Arg.HRRfDSueOYT4F3rc0C9RNVtqTm1EqsnaeaN9kWcK', 1500.00)
ON CONFLICT (email) DO NOTHING;

-- Colaboradores por boleta (20260001..20260050). Mismo hash que en Escenario 1.
INSERT INTO users (name, email, phone, password_hash, balance)
SELECT s.name, 'boleta' || s.bol || '@corporativoalpha.com', NULL,
       '$2b$10$0FLEUX0UWGJ3mLoGY7mpMeh3TvKO5.1CiQawGsKLu4WX9ikg.qyk2', 500.00
FROM (VALUES
  ('Alex Rivera','20260001'),('Brenda Soto','20260002'),('Cesar Luna','20260003'),
  ('Diana Vega','20260004'),('Eduardo Mora','20260005'),('Fernanda Rios','20260006'),
  ('Gabriel Diaz','20260007'),('Helena Cruz','20260008'),('Ivan Ortega','20260009'),
  ('Julia Navarro','20260010'),('Kevin Flores','20260011'),('Laura Campos','20260012'),
  ('Mateo Salas','20260013'),('Natalia Ponce','20260014'),('Oscar Reyes','20260015'),
  ('Paula Marin','20260016'),('Ricardo Leon','20260017'),('Sofia Bravo','20260018'),
  ('Tomas Aguilar','20260019'),('Valeria Silva','20260020'),('Andres Molina','20260021'),
  ('Camila Fuentes','20260022'),('Diego Ibarra','20260023'),('Elena Vargas','20260024'),
  ('Felipe Robles','20260025'),('Giselle Santos','20260026'),('Hector Mejia','20260027'),
  ('Isabel Franco','20260028'),('Javier Nunez','20260029'),('Karla Cardenas','20260030'),
  ('Leonardo Paredes','20260031'),('Mariana Lozano','20260032'),('Nicolas Vidal','20260033'),
  ('Olivia Herrera','20260034'),('Pablo Trevino','20260035'),('Regina Solis','20260036'),
  ('Samuel Escobar','20260037'),('Teresa Galvan','20260038'),('Uriel Bautista','20260039'),
  ('Victoria Roman','20260040'),('Walter Medina','20260041'),('Ximena Carrillo','20260042'),
  ('Yahir Padilla','20260043'),('Zaira Beltran','20260044'),('Adrian Montoya','20260045'),
  ('Bianca Orozco','20260046'),('Cristian Valdez','20260047'),('Daniela Pineda','20260048'),
  ('Emilio Salazar','20260049'),('Fabiola Quintana','20260050')
) AS s(name, bol)
ON CONFLICT (email) DO NOTHING;

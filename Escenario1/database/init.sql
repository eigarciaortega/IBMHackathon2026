-- Meeting Room Reservation System Database Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    correo VARCHAR(255) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Colaborador' CHECK (role IN ('Administrador', 'Colaborador')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_email CHECK (correo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('sala', 'escritorio')),
    recursos JSONB DEFAULT '[]'::jsonb,
    capacidad INTEGER NOT NULL CHECK (capacidad > 0),
    estado VARCHAR(50) NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'ocupado')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reservations table
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sala_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    cantidad_personas INTEGER NOT NULL CHECK (cantidad_personas > 0),
    estado VARCHAR(50) NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cancelado')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_dates CHECK (fecha_fin > fecha_inicio)
);

-- Create indexes for better query performance
CREATE INDEX idx_users_correo ON users(correo);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_rooms_estado ON rooms(estado);
CREATE INDEX idx_rooms_tipo ON rooms(tipo);
CREATE INDEX idx_rooms_nombre ON rooms(nombre);
CREATE INDEX idx_reservations_sala_id ON reservations(sala_id);
CREATE INDEX idx_reservations_usuario_id ON reservations(usuario_id);
CREATE INDEX idx_reservations_estado ON reservations(estado);
CREATE INDEX idx_reservations_dates ON reservations(fecha_inicio, fecha_fin);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO users (nombre, correo, contrasena, role) VALUES
('Administrador', 'admin@corporativoalpha.com', '$2b$12$W2TXYZBdgyIbud5LeQVoxuTgxjgF3awHsmyu9p2CF0GgMCf9eFaY6', 'Administrador'),
('Carlos Méndez', 'carlos.mendez@corporativoalpha.com', '$2b$12$y.E/eekIxqc5C4EaBLGMO.J.JZyz80xS33VszqnR2H0XG5PB2KWLu', 'Colaborador'),
('Ana Torres', 'ana.torres@corporativoalpha.com', '$2b$12$y.E/eekIxqc5C4EaBLGMO.J.JZyz80xS33VszqnR2H0XG5PB2KWLu', 'Colaborador');

INSERT INTO rooms (nombre, tipo, recursos, capacidad, estado) VALUES
('Sala de Juntas A', 'sala', '["computadora", "proyector", "aire_condicionado"]'::jsonb, 12, 'disponible'),
('Sala de Juntas B', 'sala', '["computadora", "proyector"]'::jsonb, 8, 'disponible'),
('Sala de Conferencias', 'sala', '["computadora", "proyector", "aire_condicionado", "pizarra"]'::jsonb, 20, 'disponible'),
('Escritorio 1', 'escritorio', '["computadora"]'::jsonb, 1, 'disponible'),
('Escritorio 2', 'escritorio', '["computadora", "aire_condicionado"]'::jsonb, 1, 'disponible'),
('Escritorio 3', 'escritorio', '["computadora", "lampara"]'::jsonb, 1, 'disponible');

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Display table information
SELECT 'Database schema created successfully!' AS status;
SELECT 'Tables created:' AS info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Made with Bob

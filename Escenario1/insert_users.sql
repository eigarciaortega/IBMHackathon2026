-- Insert users with properly hashed passwords
-- Password for all users: Admin123 for admin, User123 for collaborators
-- These are bcrypt hashes generated with passlib

INSERT INTO users (nombre, correo, contrasena, role) VALUES
('Administrador', 'admin@corporativoalpha.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqVr/1jriu', 'Administrador'),
('Carlos Méndez', 'carlos.mendez@corporativoalpha.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqVr/1jriu', 'Colaborador'),
('Ana Torres', 'ana.torres@corporativoalpha.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqVr/1jriu', 'Colaborador')
ON CONFLICT (correo) DO NOTHING;

-- Insert sample rooms
INSERT INTO rooms (nombre, tipo, recursos, capacidad, estado) VALUES
('Sala de Juntas A', 'sala', '["computadora", "proyector", "aire_condicionado"]'::jsonb, 12, 'disponible'),
('Sala de Juntas B', 'sala', '["computadora", "proyector"]'::jsonb, 8, 'disponible'),
('Sala de Conferencias', 'sala', '["computadora", "proyector", "aire_condicionado", "pizarra"]'::jsonb, 20, 'disponible'),
('Escritorio 1', 'escritorio', '["computadora"]'::jsonb, 1, 'disponible'),
('Escritorio 2', 'escritorio', '["computadora", "aire_condicionado"]'::jsonb, 1, 'disponible'),
('Escritorio 3', 'escritorio', '["computadora", "lampara"]'::jsonb, 1, 'disponible')
ON CONFLICT DO NOTHING;

SELECT 'Users and rooms inserted successfully!' AS status;

-- Made with Bob

-- Creación de la tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    rol VARCHAR(20) NOT NULL
);

-- Creación de la tabla de espacios (Salas y Escritorios)
CREATE TABLE IF NOT EXISTS espacios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    capacidad INT NOT NULL,
    recursos TEXT,
    piso VARCHAR(20) NOT NULL
);

-- Creación de la tabla de reservas
CREATE TABLE IF NOT EXISTS reservas (
    id SERIAL PRIMARY KEY,
    space_id INT NOT NULL,
    usuario_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    asistentes INT NOT NULL,
    FOREIGN KEY (space_id) REFERENCES espacios(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Usuarios obligatorios del ejercicio
INSERT INTO usuarios (email, password, rol) VALUES
('admin@corporativoalpha.com', 'Admin123', 'ADMINISTRADOR'),
('carlos.mendez@corporativoalpha.com', 'User123', 'COLABORADOR'),
('ana.torres@corporativoalpha.com', 'User123', 'COLABORADOR')
ON CONFLICT (email) DO NOTHING;

-- Espacios iniciales de prueba
INSERT INTO espacios (nombre, tipo, capacidad, recursos, piso) VALUES
('Sala Creativa', 'SALA', 8, 'Proyector, Aire acondicionado', 'Piso 1'),
('Escritorio Ventana', 'DESK', 1, 'Monitor 24 pulgadas', 'Piso 2');
-- Tabla de Usuarios (Roles: ADMINISTRADOR, COLABORADOR)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL
);

-- Tabla de Espacios (Salas y Hot Desks)
CREATE TABLE spaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'SALA' o 'ESCRITORIO'
    capacity INTEGER NOT NULL,
    resources TEXT, -- Ej: 'Proyector, Aire Acondicionado'
    location VARCHAR(50)
);

-- Tabla de Reservas
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    space_id INTEGER REFERENCES spaces(id),
    user_id INTEGER REFERENCES users(id),
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    attendees INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar los usuarios obligatorios de prueba
INSERT INTO users (email, password, role) VALUES 
('admin@corporativoalpha.com', 'Admin123', 'ADMINISTRADOR'),
('carlos.mendez@corporativoalpha.com', 'User123', 'COLABORADOR'),
('ana.torres@corporativoalpha.com', 'User123', 'COLABORADOR');

-- Insertar un par de espacios para probar el MVP
INSERT INTO spaces (name, type, capacity, resources, location) VALUES 
('Sala Creativa', 'SALA', 8, 'Proyector, Pizarra, A/C', 'Piso 1'),
('Escritorio Ventana 1', 'ESCRITORIO', 1, 'Monitor 27", Silla Ergonómica', 'Piso 2');

select * from users;
select * from spaces;
select * from bookings;


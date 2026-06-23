-- 1. Forzar UTF-8 desde el principio
SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS officespace_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE officespace_db;

-- 2. Tabla de Usuarios
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('ADMINISTRADOR', 'COLABORADOR') NOT NULL,
    activo TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO usuarios (email, password, rol) VALUES 
('admin@corporativoalpha.com', 'Admin123', 'ADMINISTRADOR'),
('carlos.mendez@corporativoalpha.com', 'User123', 'COLABORADOR'),
('ana.torres@corporativoalpha.com', 'User123', 'COLABORADOR');

-- 3. Tabla de Espacios
CREATE TABLE espacios (
    id_espacio INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo ENUM('SALA', 'DESK') NOT NULL,
    capacidad INT NOT NULL,
    recursos VARCHAR(255),
    piso VARCHAR(50),
    activo TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertamos los 10 espacios en un solo bloque con IDs exactos y ortografía perfecta
INSERT INTO espacios (id_espacio, nombre, tipo, capacidad, recursos, piso, activo) VALUES 
(1, 'Sala Creativa', 'SALA', 8, 'Proyector, Pantalla 65, AC', 'Piso 2', 1),
(2, 'Sala Ejecutiva', 'SALA', 4, 'TV, Teléfono IP', 'Piso 2', 1),
(3, 'Escritorio Ventana 1', 'DESK', 1, 'Monitor Extra', 'Piso 3', 1),
(4, 'Escritorio Silencio', 'DESK', 1, 'Ergonómico', 'Piso 3', 1),
(5, 'Sala de Consejo VIP', 'SALA', 15, 'Pantalla Interactiva 85 4K, Sistema de Audio Premium, AC', 'Piso 4', 1),
(6, 'Sala de Innovación', 'SALA', 10, 'Proyector Láser de Alta Gama, Pizarrón de Cristal', 'Piso 1', 1),
(7, 'Zona Abierta - Desk 01', 'DESK', 1, 'Monitor Estándar', 'Piso 3', 1),
(8, 'Zona Abierta - Desk 02', 'DESK', 1, 'Monitor Estándar', 'Piso 3', 1),
(9, 'Zona Abierta - Desk 03', 'DESK', 1, 'Ninguno', 'Piso 3', 1),
(10, 'Zona Abierta - Desk 04', 'DESK', 1, 'Ninguno', 'Piso 3', 1);

-- 4. Tabla de Reservas
CREATE TABLE reservas (
    id_reserva INT AUTO_INCREMENT PRIMARY KEY,
    id_espacio INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    asistentes INT NOT NULL,
    notas TEXT,
    estatus ENUM('Activa', 'Cancelada') DEFAULT 'Activa',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_espacio) REFERENCES espacios(id_espacio),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tus 26 reservas de prueba asignadas a los espacios correctos
INSERT INTO reservas (id_espacio, id_usuario, fecha, hora_inicio, hora_fin, asistentes, notas, estatus) VALUES
(1, 1, CURDATE(), '07:00', '08:00', 3, 'Standup matutino', 'Activa'),
(2, 2, CURDATE(), '08:00', '09:00', 2, 'Revision de sprint', 'Activa'),
(5, 3, CURDATE(), '09:00', '10:30', 8, 'Workshop de innovacion', 'Activa'),
(6, 1, CURDATE(), '10:00', '11:00', 4, 'Sync con cliente', 'Activa'),
(3, 2, CURDATE(), '11:00', '12:00', 1, 'Trabajo enfocado', 'Activa'),
(1, 3, CURDATE(), '14:00', '15:00', 5, 'Presentacion de avances', 'Activa'),
(2, 1, CURDATE(), '15:00', '16:30', 4, 'Entrevista candidato senior', 'Activa'),
(5, 2, CURDATE(), '16:00', '17:00', 6, 'Retro del equipo', 'Activa'),
(6, 3, CURDATE(), '17:00', '18:00', 3, 'Planeacion Q4', 'Activa'),
(4, 1, CURDATE(), '18:00', '19:00', 1, 'Llamada con oficina EU', 'Activa'),
(1, 2, DATE_ADD(CURDATE(), INTERVAL -1 DAY), '08:00', '09:30', 5, 'Kickoff nuevo proyecto', 'Activa'),
(2, 3, DATE_ADD(CURDATE(), INTERVAL -1 DAY), '10:00', '11:00', 3, 'Revision de codigo', 'Activa'),
(5, 1, DATE_ADD(CURDATE(), INTERVAL -1 DAY), '14:00', '15:30', 7, 'Demo trimestral', 'Activa'),
(3, 2, DATE_ADD(CURDATE(), INTERVAL -1 DAY), '11:00', '12:00', 1, 'Focus time', 'Cancelada'),
(1, 1, DATE_ADD(CURDATE(), INTERVAL -2 DAY), '09:00', '10:00', 4, 'Junta directiva', 'Activa'),
(6, 3, DATE_ADD(CURDATE(), INTERVAL -2 DAY), '10:00', '11:30', 8, 'Taller de diseno', 'Activa'),
(2, 2, DATE_ADD(CURDATE(), INTERVAL -2 DAY), '13:00', '14:00', 2, 'One on one', 'Cancelada'),
(5, 1, DATE_ADD(CURDATE(), INTERVAL -3 DAY), '08:00', '09:00', 10, 'All hands meeting', 'Activa'),
(1, 3, DATE_ADD(CURDATE(), INTERVAL -3 DAY), '11:00', '12:30', 5, 'Capacitacion seguridad', 'Activa'),
(4, 2, DATE_ADD(CURDATE(), INTERVAL -3 DAY), '15:00', '16:00', 1, 'Trabajo remoto', 'Cancelada'),
(1, 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '08:00', '09:30', 6, 'Planning semanal', 'Activa'),
(5, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00', '11:00', 4, 'Review de arquitectura', 'Activa'),
(6, 3, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:00', '15:00', 3, 'Sync de producto', 'Activa'),
(2, 2, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:00', '10:30', 5, 'Workshop de testing', 'Activa'),
(1, 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '11:00', '12:00', 7, 'Presentacion a stakeholders', 'Activa'),
(4, 3, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '13:00', '14:00', 1, 'Documentacion tecnica', 'Cancelada');
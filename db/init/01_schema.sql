-- ==========================================================
-- OfficeSpace - Esquema de base de datos (migración inicial)
-- MySQL 8.0 - charset utf8mb4
-- Este script lo ejecuta el contenedor MySQL al iniciarse
-- (docker-entrypoint-initdb.d) en orden alfabético.
--
-- Cubre: R1.5-R1.7 (usuarios/roles), R3.x (espacios/recursos),
-- R6.x/R7.x (reservas y solapamiento).
-- ==========================================================

CREATE DATABASE IF NOT EXISTS officespace
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE officespace;

SET NAMES utf8mb4;
SET time_zone = '+00:00'; -- referencia temporal en UTC (R6.5)

-- ----------------------------------------------------------
-- Tabla: usuario
-- Usuario del sistema con Rol y estado activo. Las columnas
-- failed_attempts y locked_until dan soporte al bloqueo por
-- intentos fallidos (R1.4: 5 fallos -> bloqueo 300 s).
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario      INT             NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(255)    NOT NULL,
  email           VARCHAR(254)    NOT NULL,
  password_hash   VARCHAR(255)    NOT NULL,
  rol             ENUM('ADMINISTRADOR', 'COLABORADOR') NOT NULL,
  activo          BOOLEAN         NOT NULL DEFAULT TRUE,
  failed_attempts INT             NOT NULL DEFAULT 0,
  locked_until    DATETIME        NULL DEFAULT NULL,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuario_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Tabla: espacio
-- Recurso reservable: Sala de juntas o Escritorio individual.
-- nombre 1..100 (R3.1), capacidad 1..1000 (R3.1, R3.3).
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS espacio (
  id_espacio  INT          NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(100) NOT NULL,
  tipo        ENUM('Sala de juntas', 'Escritorio individual') NOT NULL,
  capacidad   INT          NOT NULL,
  piso        INT          NOT NULL,
  ubicacion   VARCHAR(255) NOT NULL,
  activo      BOOLEAN      NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id_espacio),
  CONSTRAINT chk_espacio_capacidad CHECK (capacidad BETWEEN 1 AND 1000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Tabla: recurso
-- Catálogo normalizado de recursos (p. ej. proyector,
-- aire acondicionado).
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS recurso (
  id_recurso INT          NOT NULL AUTO_INCREMENT,
  nombre     VARCHAR(100) NOT NULL,
  PRIMARY KEY (id_recurso),
  UNIQUE KEY uq_recurso_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Tabla de unión: espacio_recurso
-- Relación muchos-a-muchos entre espacio y recurso.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS espacio_recurso (
  id_espacio INT NOT NULL,
  id_recurso INT NOT NULL,
  PRIMARY KEY (id_espacio, id_recurso),
  KEY idx_espacio_recurso_recurso (id_recurso),
  CONSTRAINT fk_er_espacio FOREIGN KEY (id_espacio)
    REFERENCES espacio (id_espacio) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_er_recurso FOREIGN KEY (id_recurso)
    REFERENCES recurso (id_recurso) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Tabla: reserva
-- Asignación de un Espacio a un Usuario para un rango datetime
-- [fecha_inicio, fecha_fin). El índice (id_espacio, fecha_inicio,
-- fecha_fin) soporta la verificación de solapamiento
-- transaccional por espacio (R6.2, R6.4).
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reserva (
  id_reserva          INT       NOT NULL AUTO_INCREMENT,
  fecha_inicio        DATETIME  NOT NULL,
  fecha_fin           DATETIME  NOT NULL,
  id_espacio          INT       NOT NULL,
  id_usuario          INT       NOT NULL,
  cantidad_asistentes INT       NOT NULL,
  estado_reserva      ENUM('Activo', 'Cancelado')  NOT NULL DEFAULT 'Activo',
  estado_asistencia   ENUM('show', 'no-show')      NULL DEFAULT NULL,
  fecha_creacion      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_cancelacion   DATETIME  NULL DEFAULT NULL,
  PRIMARY KEY (id_reserva),
  KEY idx_reserva_solapamiento (id_espacio, fecha_inicio, fecha_fin),
  KEY idx_reserva_usuario (id_usuario),
  CONSTRAINT fk_reserva_espacio FOREIGN KEY (id_espacio)
    REFERENCES espacio (id_espacio) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reserva_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_reserva_rango CHECK (fecha_fin > fecha_inicio),
  CONSTRAINT chk_reserva_asistentes CHECK (cantidad_asistentes >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

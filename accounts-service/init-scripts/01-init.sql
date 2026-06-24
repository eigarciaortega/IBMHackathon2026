-- =====================================================
-- NeoWallet - Accounts Database Initialization Script
-- =====================================================
-- Descripción: Crea la tabla de usuarios y datos semilla
-- Base de Datos: accounts_db
-- =====================================================

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice en email para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insertar datos semilla (usuarios de prueba)
INSERT INTO users (name, email, balance) VALUES
    ('María García', 'maria.garcia@neowallet.com', 1500.00),
    ('Carlos Rodríguez', 'carlos.rodriguez@neowallet.com', 2300.00),
    ('Ana Martínez', 'ana.martinez@neowallet.com', 850.00),
    ('Luis Hernández', 'luis.hernandez@neowallet.com', 3200.00),
    ('Sofia López', 'sofia.lopez@neowallet.com', 1100.00),
    ('Diego Torres', 'diego.torres@neowallet.com', 450.00)
ON CONFLICT (email) DO NOTHING;

-- Verificar la inserción
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    RAISE NOTICE '✅ Tabla users creada exitosamente con % usuarios', user_count;
END $$;

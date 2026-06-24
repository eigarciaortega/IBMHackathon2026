-- =====================================================
-- NeoWallet - Processor Database Initialization Script
-- =====================================================
-- Descripción: Crea la tabla de transacciones
-- Base de Datos: processor_db
-- =====================================================

-- Crear tipo ENUM para estados de transacción
DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM (
        'PENDING',
        'DEBITED',
        'COMPLETED',
        'FAILED',
        'ROLLED_BACK'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear tabla de transacciones
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    status transaction_status NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints adicionales
    CONSTRAINT different_users CHECK (sender_id != receiver_id)
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verificar la creación
DO $$
BEGIN
    RAISE NOTICE '✅ Tabla transactions creada exitosamente';
END $$;

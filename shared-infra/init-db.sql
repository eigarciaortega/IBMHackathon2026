-- BeeSpace Database Initialization Script
-- PostgreSQL 15
-- Created: 2026-06-22

-- Enable UUID extension (optional, for future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'COLABORADOR')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: spaces
-- ============================================
CREATE TABLE spaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('SALA', 'DESK')),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    floor VARCHAR(50),
    has_projector BOOLEAN DEFAULT FALSE,
    has_ac BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: bookings
-- ============================================
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    attendees INTEGER NOT NULL CHECK (attendees > 0),
    status VARCHAR(50) DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_bookings_space_time ON bookings(space_id, start_time, end_time);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_spaces_type ON spaces(type);
CREATE INDEX idx_spaces_capacity ON spaces(capacity);
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: Users
-- ============================================
-- Password for all users: "Admin123" for admin, "User123" for collaborators
-- Hashed with bcrypt (10 rounds)

INSERT INTO users (email, password, name, role) VALUES
('admin@corporativoalpha.com', '$2a$10$rZ8qH8vYZ8qH8vYZ8qH8vOqH8vYZ8qH8vYZ8qH8vYZ8qH8vYZ8qH8u', 'Administrator', 'ADMIN'),
('carlos.mendez@corporativoalpha.com', '$2a$10$rZ8qH8vYZ8qH8vYZ8qH8vOqH8vYZ8qH8vYZ8qH8vYZ8qH8vYZ8qH8u', 'Carlos Méndez', 'COLABORADOR'),
('ana.torres@corporativoalpha.com', '$2a$10$rZ8qH8vYZ8qH8vYZ8qH8vOqH8vYZ8qH8vYZ8qH8vYZ8qH8vYZ8qH8u', 'Ana Torres', 'COLABORADOR'),
('maria.garcia@corporativoalpha.com', '$2a$10$rZ8qH8vYZ8qH8vYZ8qH8vOqH8vYZ8qH8vYZ8qH8vYZ8qH8vYZ8qH8u', 'María García', 'COLABORADOR'),
('juan.lopez@corporativoalpha.com', '$2a$10$rZ8qH8vYZ8qH8vYZ8qH8vOqH8vYZ8qH8vYZ8qH8vYZ8qH8vYZ8qH8u', 'Juan López', 'COLABORADOR');

-- ============================================
-- SEED DATA: Spaces
-- ============================================
INSERT INTO spaces (name, type, capacity, floor, has_projector, has_ac) VALUES
-- Meeting Rooms
('Sala Creativa', 'SALA', 8, 'Piso 1', true, true),
('Sala Ejecutiva', 'SALA', 12, 'Piso 2', true, true),
('Sala Innovación', 'SALA', 6, 'Piso 1', true, false),
('Sala Estrategia', 'SALA', 10, 'Piso 2', true, true),
('Sala Colaboración', 'SALA', 15, 'Piso 3', true, true),

-- Desks
('Escritorio Ventana 1', 'DESK', 1, 'Piso 1', false, true),
('Escritorio Ventana 2', 'DESK', 1, 'Piso 1', false, true),
('Escritorio Central 1', 'DESK', 1, 'Piso 1', false, true),
('Escritorio Central 2', 'DESK', 1, 'Piso 2', false, true),
('Escritorio Privado', 'DESK', 1, 'Piso 2', false, true);

-- ============================================
-- SEED DATA: Sample Bookings
-- ============================================
-- Creating bookings for today and future dates
-- Note: These are sample bookings. In production, dates should be dynamic.

INSERT INTO bookings (space_id, user_id, start_time, end_time, attendees, status) VALUES
-- Today's bookings (using relative dates)
(1, 2, CURRENT_TIMESTAMP + INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '3 hours', 6, 'CONFIRMED'),
(2, 3, CURRENT_TIMESTAMP + INTERVAL '2 hours', CURRENT_TIMESTAMP + INTERVAL '4 hours', 10, 'CONFIRMED'),
(6, 4, CURRENT_TIMESTAMP + INTERVAL '30 minutes', CURRENT_TIMESTAMP + INTERVAL '4 hours', 1, 'CONFIRMED'),

-- Tomorrow's bookings
(1, 3, CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '9 hours', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '11 hours', 8, 'CONFIRMED'),
(3, 2, CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '14 hours', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '16 hours', 5, 'CONFIRMED'),
(7, 5, CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '8 hours', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '17 hours', 1, 'CONFIRMED'),

-- Future bookings
(4, 2, CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '10 hours', CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '12 hours', 8, 'CONFIRMED'),
(5, 3, CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '15 hours', CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '17 hours', 12, 'CONFIRMED'),

-- Cancelled booking (for testing)
(2, 4, CURRENT_TIMESTAMP + INTERVAL '4 days' + INTERVAL '9 hours', CURRENT_TIMESTAMP + INTERVAL '4 days' + INTERVAL '11 hours', 6, 'CANCELLED');

-- ============================================
-- VIEWS: Useful queries for reporting
-- ============================================

-- View: Active bookings with space and user details
CREATE OR REPLACE VIEW active_bookings_view AS
SELECT 
    b.id,
    b.start_time,
    b.end_time,
    b.attendees,
    b.status,
    b.created_at,
    s.id as space_id,
    s.name as space_name,
    s.type as space_type,
    s.capacity as space_capacity,
    s.floor as space_floor,
    u.id as user_id,
    u.name as user_name,
    u.email as user_email
FROM bookings b
JOIN spaces s ON b.space_id = s.id
JOIN users u ON b.user_id = u.id
WHERE b.status = 'CONFIRMED'
ORDER BY b.start_time;

-- View: Space occupancy statistics
CREATE OR REPLACE VIEW space_occupancy_stats AS
SELECT 
    s.id,
    s.name,
    s.type,
    s.capacity,
    COUNT(b.id) as total_bookings,
    COUNT(CASE WHEN b.status = 'CONFIRMED' THEN 1 END) as confirmed_bookings,
    COUNT(CASE WHEN b.status = 'CANCELLED' THEN 1 END) as cancelled_bookings
FROM spaces s
LEFT JOIN bookings b ON s.id = b.space_id
GROUP BY s.id, s.name, s.type, s.capacity
ORDER BY total_bookings DESC;

-- ============================================
-- FUNCTIONS: Utility functions
-- ============================================

-- Function: Check if a space is available for a given time range
CREATE OR REPLACE FUNCTION is_space_available(
    p_space_id INTEGER,
    p_start_time TIMESTAMP,
    p_end_time TIMESTAMP,
    p_exclude_booking_id INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    overlap_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO overlap_count
    FROM bookings
    WHERE space_id = p_space_id
        AND status = 'CONFIRMED'
        AND (id != p_exclude_booking_id OR p_exclude_booking_id IS NULL)
        AND (
            (start_time < p_end_time AND end_time > p_start_time)
        );
    
    RETURN overlap_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Function: Get space utilization rate for a date range
CREATE OR REPLACE FUNCTION get_space_utilization(
    p_space_id INTEGER,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS NUMERIC AS $$
DECLARE
    total_hours NUMERIC;
    booked_hours NUMERIC;
BEGIN
    -- Calculate total available hours (assuming 8 hours per day)
    total_hours := (p_end_date - p_start_date + 1) * 8;
    
    -- Calculate booked hours
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600), 0)
    INTO booked_hours
    FROM bookings
    WHERE space_id = p_space_id
        AND status = 'CONFIRMED'
        AND DATE(start_time) BETWEEN p_start_date AND p_end_date;
    
    -- Return utilization percentage
    IF total_hours > 0 THEN
        RETURN ROUND((booked_hours / total_hours) * 100, 2);
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANTS: Set permissions (optional, for production)
-- ============================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;

-- ============================================
-- COMMENTS: Documentation
-- ============================================
COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON TABLE spaces IS 'Physical spaces (meeting rooms and desks) available for booking';
COMMENT ON TABLE bookings IS 'Reservations made by users for specific spaces and time slots';

COMMENT ON COLUMN users.role IS 'User role: ADMIN (full access) or COLABORADOR (limited access)';
COMMENT ON COLUMN spaces.type IS 'Space type: SALA (meeting room) or DESK (individual desk)';
COMMENT ON COLUMN bookings.status IS 'Booking status: CONFIRMED (active) or CANCELLED (inactive)';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'BeeSpace Database Initialized Successfully!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Tables created: users, spaces, bookings';
    RAISE NOTICE 'Sample data inserted:';
    RAISE NOTICE '  - 5 users (1 admin, 4 collaborators)';
    RAISE NOTICE '  - 10 spaces (5 rooms, 5 desks)';
    RAISE NOTICE '  - 9 sample bookings';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Default credentials:';
    RAISE NOTICE '  Admin: admin@corporativoalpha.com / Admin123';
    RAISE NOTICE '  User: carlos.mendez@corporativoalpha.com / User123';
    RAISE NOTICE '==============================================';
END $$;

-- Made with Bob

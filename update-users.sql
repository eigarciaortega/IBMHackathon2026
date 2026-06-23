-- Script para actualizar los nombres de usuarios en la base de datos existente
-- Ejecutar este script si ya tienes datos en la base de datos

-- Actualizar nombres y emails de usuarios
UPDATE users SET 
    name = 'María García',
    email = 'maria.garcia@neowallet.com'
WHERE id = 1;

UPDATE users SET 
    name = 'Carlos Rodríguez',
    email = 'carlos.rodriguez@neowallet.com'
WHERE id = 2;

UPDATE users SET 
    name = 'Ana Martínez',
    email = 'ana.martinez@neowallet.com'
WHERE id = 3;

-- Verificar los cambios
SELECT id, name, email, balance FROM users ORDER BY id;

-- Made with Bob

-- NeoWallet: Datos semilla para desarrollo y pruebas
-- Contraseña de todos los usuarios: password123
-- BCrypt hash (strength=12) verificado de "password123"
-- Hash: $2a$12$OGZ0IVizc7wFTa5PBL3Zt.AnXnBiFd0nefzbQpJhh.XhzT/Koyd1y

INSERT INTO users (name, email, password, balance) VALUES
('Usuario A (Rico)',  'usuario.a@neowallet.com', '$2a$12$OGZ0IVizc7wFTa5PBL3Zt.AnXnBiFd0nefzbQpJhh.XhzT/Koyd1y', 1000.00),
('Usuario B (Pobre)', 'usuario.b@neowallet.com', '$2a$12$OGZ0IVizc7wFTa5PBL3Zt.AnXnBiFd0nefzbQpJhh.XhzT/Koyd1y',   50.00),
('Usuario C (Nuevo)', 'usuario.c@neowallet.com', '$2a$12$OGZ0IVizc7wFTa5PBL3Zt.AnXnBiFd0nefzbQpJhh.XhzT/Koyd1y',    0.00);

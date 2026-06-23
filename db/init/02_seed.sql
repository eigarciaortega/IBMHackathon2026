-- ==========================================================
-- OfficeSpace - Datos semilla (seed)
-- Usuarios semilla requeridos por R1.5, R1.6 y R1.7.
-- Las contraseñas se almacenan como hash bcrypt (nunca texto plano).
--   admin@corporativoalpha.com        / Admin123 -> ADMINISTRADOR (R1.5)
--   carlos.mendez@corporativoalpha.com / User123 -> COLABORADOR  (R1.6)
--   ana.torres@corporativoalpha.com    / User123 -> COLABORADOR  (R1.7)
-- Hashes generados con bcrypt (cost=10) y verificados contra su
-- contraseña en texto plano correspondiente.
-- ==========================================================

USE officespace;

INSERT INTO usuario (nombre, email, password_hash, rol, activo)
VALUES
  ('Administrador Alpha',
   'admin@corporativoalpha.com',
   '$2b$10$fs6aw6Ux48ZIJa0CoxnBSOObKyuSdeZqn8C3vsR/gGFZNQt8X96ki',
   'ADMINISTRADOR',
   TRUE),
  ('Carlos Méndez',
   'carlos.mendez@corporativoalpha.com',
   '$2b$10$6wils7qKcmWAw0Rw2r7d7OSFs1cwFTqih0oNCDcRuFX4yNx0nT3ey',
   'COLABORADOR',
   TRUE),
  ('Ana Torres',
   'ana.torres@corporativoalpha.com',
   '$2b$10$9WvOaMPWU1sll05Vsr7L2Ow4q1A5JwVi.ElyyQl7eNhXJn7FkTzxe',
   'COLABORADOR',
   TRUE)
ON DUPLICATE KEY UPDATE
  nombre        = VALUES(nombre),
  password_hash = VALUES(password_hash),
  rol           = VALUES(rol),
  activo        = VALUES(activo);

-- ----------------------------------------------------------
-- Catálogo base de recursos. Lista canónica de 15 recursos
-- disponibles para asociar a los Espacios (relación M-N).
-- ----------------------------------------------------------
INSERT INTO recurso (nombre)
VALUES
  ('Proyector'),
  ('Pantalla'),
  ('Bocinas'),
  ('Micrófono'),
  ('Cámara de videoconferencia'),
  ('Aire acondicionado'),
  ('Pizarrón blanco'),
  ('Conexión HDMI'),
  ('Contactos eléctricos'),
  ('Puerto Ethernet'),
  ('Wi-Fi'),
  ('Monitor externo'),
  ('Docking station'),
  ('Silla ergonómica'),
  ('Lámpara de escritorio')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Update passwords with new bcrypt hashes
UPDATE users SET contrasena = '$2b$12$W2TXYZBdgyIbud5LeQVoxuTgxjgF3awHsmyu9p2CF0GgMCf9eFaY6' WHERE correo = 'admin@corporativoalpha.com';
UPDATE users SET contrasena = '$2b$12$y.E/eekIxqc5C4EaBLGMO.J.JZyz80xS33VszqnR2H0XG5PB2KWLu' WHERE correo = 'carlos.mendez@corporativoalpha.com';
UPDATE users SET contrasena = '$2b$12$y.E/eekIxqc5C4EaBLGMO.J.JZyz80xS33VszqnR2H0XG5PB2KWLu' WHERE correo = 'ana.torres@corporativoalpha.com';

-- Made with Bob

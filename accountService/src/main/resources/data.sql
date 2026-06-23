INSERT INTO users (public_id, name, email, balance) VALUES
    (gen_random_uuid(), 'Usuario A (Rico)',  'usuario.a@neowallet.com', 1000.00),
    (gen_random_uuid(), 'Usuario B (Pobre)', 'usuario.b@neowallet.com',   50.00),
    (gen_random_uuid(), 'Usuario C (Nuevo)', 'usuario.c@neowallet.com',    0.00)
ON CONFLICT (email) DO NOTHING;

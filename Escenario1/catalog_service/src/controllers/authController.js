const authService = require('../services/authService');

const login = async (req, res) => {
  try {
    const { email, contrasena } = req.body;

    console.log('=== DEBUG LOGIN ===');
    console.log('Email:', email);

    if (!email || !contrasena) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const result = await authService.login(email, contrasena);

    if (!result) {
      console.log('❌ Credenciales inválidas');
      console.log('========================');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    console.log('✅ Login exitoso');
    console.log('Usuario:', result.user);
    console.log('Token generado (primeros 50 chars):', result.token.substring(0, 50) + '...');
    console.log('========================');

    res.json({
      message: 'Login exitoso',
      token: result.token,
      user: result.user
    });

  } catch (err) {
    console.log('❌ Error en login:', err);
    console.log('========================');
    res.status(500).json({ error: 'Error en el servidor', detail: err.message });
  }
};

module.exports = { login };
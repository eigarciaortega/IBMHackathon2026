const authService = require('../services/authService');

const login = async (req, res) => {
  try {
    const { email, contrasena } = req.body;

    if (!email || !contrasena) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const result = await authService.login(email, contrasena);

    if (!result) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    res.json({
      message: 'Login exitoso',
      token: result.token,
      user: result.user
    });

  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor', detail: err.message });
  }
};

module.exports = { login };
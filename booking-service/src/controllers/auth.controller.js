const authService = require('../services/auth.service');

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await authService.login(email, password);

    if (!result) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { login };

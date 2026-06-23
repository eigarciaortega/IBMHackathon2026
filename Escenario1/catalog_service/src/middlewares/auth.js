const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Formato de token inválido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol ADMINISTRADOR' });
  }
  next();
};

module.exports = { verifyToken, verifyAdmin };
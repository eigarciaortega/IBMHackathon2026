const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  console.log('=== DEBUG verifyToken ===');
  console.log('Authorization header:', authHeader);

  if (!authHeader) {
    console.log('❌ No se proporcionó token');
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    console.log('❌ Formato de token inválido');
    return res.status(401).json({ error: 'Formato de token inválido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, nombre, perfil }
    console.log('✅ Token válido, usuario:', decoded);
    console.log('========================');
    next();
  } catch (err) {
    console.log('❌ Error al verificar token:', err.message);
    console.log('========================');
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

const verifyAdmin = (req, res, next) => {
  // Debug: Imprimir información del usuario
  console.log('=== DEBUG verifyAdmin ===');
  console.log('req.user:', req.user);
  console.log('Rol recibido:', req.user?.perfil);
  console.log('========================');

  if (!req.user) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (req.user.perfil !== 'ADMINISTRADOR') {
    return res.status(403).json({
      error: 'Acceso denegado: se requiere rol ADMINISTRADOR',
      rolRecibido: req.user.perfil
    });
  }
  
  next();
};

module.exports = { verifyToken, verifyAdmin };

// Made with Bob

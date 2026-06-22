const jwt = require("jsonwebtoken");

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
};

const authenticateToken = (req, res, next) => {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      message: "Token requerido. Usa Authorization: Bearer <token>."
    });
  }

  let secret;

  try {
    secret = getJwtSecret();
  } catch (error) {
    return res.status(500).json({
      message: "JWT_SECRET no esta configurado."
    });
  }

  try {
    req.user = jwt.verify(token, secret);
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Token invalido o expirado."
    });
  }
};

const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({
      message: `Acceso restringido al rol ${role}.`
    });
  }

  return next();
};

const requireAdmin = requireRole("ADMINISTRADOR");

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin
};

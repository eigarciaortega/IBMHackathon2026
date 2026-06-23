const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        // Obtener token del header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Acceso denegado. No se proporcionó token'
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();

    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Token inválido o expirado'
        });
    }
};

// Middleware para verificar rol de administrador
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'ADMINISTRADOR') {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Se requiere rol de administrador'
        });
    }
    next();
};

module.exports = { authMiddleware, isAdmin };

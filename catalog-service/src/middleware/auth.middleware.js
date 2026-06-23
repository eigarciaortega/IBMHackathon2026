const axios = require('axios');

// Middleware para verificar token JWT
const verifyToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Acceso denegado. No se proporcionó token'
            });
        }

        // Verificar token con el auth-service
        const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.data.success) {
            req.user = response.data.data.user;
            next();
        } else {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }

    } catch (error) {
        return res.status(401).json({
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

module.exports = { verifyToken, isAdmin };

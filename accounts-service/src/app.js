/**
 * Accounts Service - Main Application
 * NeoWallet - Sistema de Pagos P2P
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const accountRoutes = require('./routes/accountRoutes');
const db = require('./config/database');

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middlewares
// ============================================

// Seguridad
app.use(helmet());

// CORS
app.use(cors());

// Logging de requests
app.use(morgan('combined'));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// Health Check
// ============================================

app.get('/health', async (req, res) => {
    try {
        // Verificar conexión a base de datos
        await db.query('SELECT 1');

        res.status(200).json({
            success: true,
            service: 'accounts-service',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected'
        });
    } catch (error) {
        console.error('❌ Health check failed:', error);
        res.status(503).json({
            success: false,
            service: 'accounts-service',
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

// ============================================
// Routes
// ============================================

app.use('/accounts', accountRoutes);
// También montar las rutas en /api para recharge
app.use('/', accountRoutes);

// ============================================
// Root endpoint
// ============================================

app.get('/', (req, res) => {
    res.json({
        service: 'NeoWallet Accounts Service',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: 'GET /health',
            accounts: {
                getAll: 'GET /accounts',
                getById: 'GET /accounts/:id',
                recharge: 'POST /api/recharge',
                updateBalance: 'POST /accounts/update-balance'
            }
        }
    });
});

// ============================================
// 404 Handler
// ============================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint no encontrado',
            path: req.path
        }
    });
});

// ============================================
// Error Handler
// ============================================

app.use((err, req, res, next) => {
    console.error('❌ Error no manejado:', err);

    res.status(err.statusCode || 500).json({
        success: false,
        error: {
            code: err.code || 'INTERNAL_SERVER_ERROR',
            message: err.message || 'Error interno del servidor',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
});

// ============================================
// Iniciar Servidor
// ============================================

const startServer = async () => {
    try {
        // Verificar conexión a base de datos
        console.log('🔌 Conectando a la base de datos...');
        const dbConnected = await db.testConnection();

        if (!dbConnected) {
            throw new Error('No se pudo conectar a la base de datos');
        }

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log('═══════════════════════════════════════════════════════');
            console.log('🚀 Accounts Service iniciado exitosamente');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`📍 Puerto: ${PORT}`);
            console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 URL: http://localhost:${PORT}`);
            console.log(`💚 Health Check: http://localhost:${PORT}/health`);
            console.log('═══════════════════════════════════════════════════════');
            console.log('📋 Endpoints disponibles:');
            console.log(`   GET  /accounts           - Listar usuarios`);
            console.log(`   GET  /accounts/:id       - Obtener usuario`);
            console.log(`   POST /api/recharge       - Recargar saldo`);
            console.log(`   POST /accounts/update-balance - Actualizar balance (interno)`);
            console.log('═══════════════════════════════════════════════════════');
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

// Manejo de señales de terminación
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM recibido. Cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT recibido. Cerrando servidor...');
    process.exit(0);
});

// Iniciar el servidor
startServer();

module.exports = app;

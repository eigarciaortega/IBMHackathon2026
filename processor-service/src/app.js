/**
 * Processor Service - Main Application
 * NeoWallet - Sistema de Pagos P2P
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const transferRoutes = require('./routes/transferRoutes');
const db = require('./config/database');
const HttpClient = require('./utils/httpClient');

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3001;

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

        // Verificar conectividad con Accounts Service
        const accountsServiceHealthy = await HttpClient.checkHealth();

        res.status(200).json({
            success: true,
            service: 'processor-service',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected',
            accounts_service: accountsServiceHealthy ? 'connected' : 'disconnected'
        });
    } catch (error) {
        console.error('❌ Health check failed:', error);
        res.status(503).json({
            success: false,
            service: 'processor-service',
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

app.use('/api', transferRoutes);

// ============================================
// Root endpoint
// ============================================

app.get('/', (req, res) => {
    res.json({
        service: 'NeoWallet Processor Service',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: 'GET /health',
            transfer: {
                create: 'POST /api/transfer',
                history: 'GET /api/transactions/:user_id',
                statistics: 'GET /api/statistics'
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

        // Verificar conectividad con Accounts Service
        console.log('🔌 Verificando conectividad con Accounts Service...');
        const accountsServiceHealthy = await HttpClient.checkHealth();

        if (!accountsServiceHealthy) {
            console.warn('⚠️ Advertencia: Accounts Service no disponible en el inicio');
            console.warn('   El servicio intentará conectarse cuando reciba peticiones');
        } else {
            console.log('✅ Accounts Service disponible');
        }

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log('═══════════════════════════════════════════════════════');
            console.log('🚀 Processor Service iniciado exitosamente');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`📍 Puerto: ${PORT}`);
            console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 URL: http://localhost:${PORT}`);
            console.log(`💚 Health Check: http://localhost:${PORT}/health`);
            console.log(`🔗 Accounts Service: ${process.env.ACCOUNTS_SERVICE_URL || 'http://localhost:3000'}`);
            console.log('═══════════════════════════════════════════════════════');
            console.log('📋 Endpoints disponibles:');
            console.log(`   POST /api/transfer                - Transferencia P2P`);
            console.log(`   GET  /api/transactions/:user_id   - Historial`);
            console.log(`   GET  /api/statistics              - Estadísticas`);
            console.log('═══════════════════════════════════════════════════════');
            console.log('🎯 Patrón Saga implementado para consistencia distribuida');
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

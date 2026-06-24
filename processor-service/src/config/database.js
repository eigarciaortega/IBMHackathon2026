/**
 * Database Configuration
 * Configuración de conexión a PostgreSQL para Processor Service
 */

const { Pool } = require('pg');
require('dotenv').config();

// Configuración del pool de conexiones
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'processor_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    max: 20, // Número máximo de clientes en el pool
    idleTimeoutMillis: 30000, // Tiempo de espera antes de cerrar conexión inactiva
    connectionTimeoutMillis: 2000, // Tiempo máximo de espera para conexión
});

// Event listeners para debugging
pool.on('connect', () => {
    console.log('✅ Nueva conexión establecida con la base de datos');
});

pool.on('error', (err) => {
    console.error('❌ Error inesperado en el pool de conexiones:', err);
    process.exit(-1);
});

/**
 * Ejecuta una query en la base de datos
 * @param {string} text - Query SQL
 * @param {Array} params - Parámetros de la query
 * @returns {Promise} Resultado de la query
 */
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('📊 Query ejecutada', { text, duration: `${duration}ms`, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('❌ Error en query:', { text, error: error.message });
        throw error;
    }
};

/**
 * Obtiene un cliente del pool para transacciones
 * @returns {Promise} Cliente de PostgreSQL
 */
const getClient = async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;

    // Sobrescribir release para logging
    client.release = () => {
        client.query = query;
        client.release = release;
        return release.apply(client);
    };

    return client;
};

/**
 * Verifica la conexión a la base de datos
 * @returns {Promise<boolean>}
 */
const testConnection = async () => {
    try {
        const result = await query('SELECT NOW()');
        console.log('✅ Conexión a base de datos exitosa:', result.rows[0].now);
        return true;
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error.message);
        return false;
    }
};

module.exports = {
    query,
    getClient,
    testConnection,
    pool
};

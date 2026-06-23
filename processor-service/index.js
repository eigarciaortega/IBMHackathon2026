const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
// Habilitar CORS para que Swagger pueda hacer peticiones
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// URL interna de la red de Docker para comunicarse con el Accounts Service
const ACCOUNTS_SERVICE_URL = process.env.ACCOUNTS_SERVICE_URL || 'http://accounts-service:3000';

// Health Check
app.get('/health', async (req, res) => {
    try {
        const dbRes = await pool.query('SELECT NOW()');
        res.json({ service: 'Processor Service', status: 'OK', db_time: dbRes.rows[0].now });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', error: err.message });
    }
});

// ---------------------------------------------------------
// RF-003: Transferir Dinero entre Usuarios (P2P - Motor con Patrón Saga)
// ---------------------------------------------------------
app.post('/api/transfer', async (req, res) => {
    const { sender_id, receiver_id, amount } = req.body;

    // 1. Validaciones iniciales del contrato de la API
    if (!sender_id || !receiver_id || amount === undefined) {
        return res.status(400).json({ error: 'invalid_payload', message: 'Faltan campos requeridos' });
    }
    if (sender_id === receiver_id) {
        return res.status(400).json({ error: 'self_transfer_not_allowed', message: 'No puedes transferirte a ti mismo' });
    }
    if (isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({ error: 'invalid_amount', message: 'El monto debe ser positivo y mayor a cero' });
    }

    let txId = null;

    try {
        // PASO 1 SAGA: Registrar la transacción local en estado PENDING
        const txResult = await pool.query(
            'INSERT INTO transactions (sender_id, receiver_id, amount, status) VALUES ($1, $2, $3, $4) RETURNING id',
            [sender_id, receiver_id, amount, 'PENDING']
        );
        txId = txResult.rows[0].id;

        // PASO 2 SAGA: Ejecutar llamada HTTP al Accounts Service para DEBITAR al Sender
        const debitResponse = await fetch(`${ACCOUNTS_SERVICE_URL}/accounts/update-balance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: sender_id, amount, operation: 'debit' })
        });

        const debitData = await debitResponse.json();

        if (!debitResponse.ok) {
            // Si el Accounts Service dice que no hay fondos o usuario no existe -> Marcamos FAILED
            await pool.query('UPDATE transactions SET status = $1, error_message = $2 WHERE id = $3', ['FAILED', debitData.error, txId]);
            return res.status(debitResponse.status).json({ status: 'error', error: debitData.error });
        }

        // Actualizar estado local a DEBITED (Dinero retenido con éxito)
        await pool.query('UPDATE transactions SET status = $1 WHERE id = $2', ['DEBITED', txId]);

        // PASO 3 SAGA: Ejecutar llamada HTTP al Accounts Service para ACREDITAR al Receiver
        const creditResponse = await fetch(`${ACCOUNTS_SERVICE_URL}/accounts/update-balance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: receiver_id, amount, operation: 'credit' })
        });

        const creditData = await creditResponse.json();

        if (!creditResponse.ok) {
            // ¡ALERTA CRÍTICA! El débito funcionó pero el crédito falló (ej: el receptor no existe)
            // Ejecutamos la COMPENSACIÓN del Patrón Saga para regresar el dinero al Sender
            console.log(`⚠️ Falló crédito para transacción ${txId}. Iniciando compensación (Saga Rollback)...`);
            
            const rollbackResponse = await fetch(`${ACCOUNTS_SERVICE_URL}/accounts/update-balance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: sender_id, amount, operation: 'credit' }) // Le devolvemos sumando
            });

            if (rollbackResponse.ok) {
                await pool.query('UPDATE transactions SET status = $1, error_message = $2 WHERE id = $3', ['ROLLED_BACK', 'Credit failed, funds compensated', txId]);
                return res.status(400).json({ status: 'error', message: 'La transferencia falló, pero tus fondos fueron devueltos intactos.' });
            } else {
                // El peor escenario de la arquitectura distribuida (requiere intervención manual)
                await pool.query('UPDATE transactions SET status = $1, error_message = $2 WHERE id = $3', ['FAILED', 'CRITICAL: Rollback failed', txId]);
                return res.status(500).json({ status: 'error', message: 'Inconsistencia crítica en el sistema de saldos' });
            }
        }

        // PASO 4 SAGA: Todo salió perfecto, cerramos de forma exitosa
        await pool.query('UPDATE transactions SET status = $1 WHERE id = $2', ['COMPLETED', txId]);

        res.status(200).json({
            status: 'success',
            transaction_id: txId,
            message: 'Transferencia realizada e indexada con éxito.'
        });

    } catch (err) {
        console.error('Error en el flujo orquestador P2P:', err);
        if (txId) {
            await pool.query('UPDATE transactions SET status = $1, error_message = $2 WHERE id = $3', ['FAILED', err.message, txId]);
        }
        res.status(500).json({ status: 'error', message: 'Error en el motor transaccional' });
    }
});

const PORT = process.env.PORT || 3001;
// ---------------------------------------------------------
// RF-005: Consultar Historial de Transacciones (Bonus)
// ---------------------------------------------------------
app.get('/api/transactions/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        // Validar que el ID sea numérico
        if (isNaN(user_id)) {
            return res.status(400).json({ error: 'El ID del usuario debe ser un número válido' });
        }

        // Buscar transacciones donde el usuario sea emisor (sender) O receptor (receiver)
        // Ordenado por fecha descendente (las más recientes primero)
        const queryText = `
            SELECT id, sender_id, receiver_id, amount, status, error_message, created_at 
            FROM transactions 
            WHERE sender_id = $1 OR receiver_id = $2 
            ORDER BY created_at DESC
        `;
        
        const result = await pool.query(queryText, [user_id, user_id]);

        // Formatear las transacciones agregando el "tipo" contextualmente
        const formattedTransactions = result.rows.map(tx => {
            let type = 'unknown';
            if (tx.sender_id === Number(user_id)) {
                type = 'sent';
            } else if (tx.receiver_id === Number(user_id)) {
                type = 'received';
            }

            return {
                transaction_id: tx.id,
                type: type,
                counterparty_id: type === 'sent' ? tx.receiver_id : tx.sender_id,
                amount: tx.amount,
                status: tx.status,
                error_message: tx.error_message,
                date: tx.created_at
            };
        });

        res.status(200).json({
            user_id: Number(user_id),
            total_transactions: formattedTransactions.length,
            history: formattedTransactions
        });

    } catch (err) {
        console.error('Error al consultar el historial:', err);
        res.status(500).json({ error: 'Error interno al obtener el historial' });
    }
});
app.listen(PORT, () => {
    console.log(`✅ Processor Service corriendo en el puerto ${PORT}`);
});
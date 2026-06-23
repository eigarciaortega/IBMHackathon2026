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

// Health Check
app.get('/health', async (req, res) => {
    try {
        const dbRes = await pool.query('SELECT NOW()');
        res.json({ service: 'Accounts Service', status: 'OK', db_time: dbRes.rows[0].now });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', error: err.message });
    }
});

// ---------------------------------------------------------
// RF-001: Consultar Saldo de Usuario
// ---------------------------------------------------------
app.get('/accounts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validar que el ID sea numérico
        if (isNaN(id)) {
            return res.status(400).json({ error: 'El ID del usuario debe ser un número válido' });
        }

        const result = await pool.query('SELECT id, name, email, balance FROM users WHERE id = $1', [id]);
        
        // Validar si el usuario existe (FA-1)
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ---------------------------------------------------------
// RF-002: Recargar Saldo (Simulado)
// ---------------------------------------------------------
app.post('/api/recharge', async (req, res) => {
    try {
        const { user_id, amount, payment_method } = req.body;
        
        // Validar tipos de datos (FA-3)
        if (!user_id || amount === undefined) {
            return res.status(400).json({ error: 'Faltan campos obligatorios (user_id, amount)' });
        }
        
        // Validar monto positivo mayor a cero (FA-2)
        if (isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ error: 'El monto debe ser un número mayor a cero' });
        }

        // Actualizar el saldo directamente usando RETURNING para obtener el nuevo estado
        const result = await pool.query(
            'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING id, name, balance',
            [amount, user_id]
        );

        // Validar si el usuario existe (FA-1)
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.status(200).json({ 
            message: 'Recarga exitosa', 
            user: result.rows[0] 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

const PORT = process.env.PORT || 3000;
// ---------------------------------------------------------
// RF-004: Actualizar Balance (Endpoint Interno para el Processor)
// ---------------------------------------------------------
app.post('/accounts/update-balance', async (req, res) => {
    const { user_id, amount, operation } = req.body;

    // Validaciones básicas de entrada
    if (!user_id || amount === undefined || !operation) {
        return res.status(400).json({ error: 'Faltan campos obligatorios (user_id, amount, operation)' });
    }

    if (isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({ error: 'El monto debe ser un número mayor a cero' });
    }

    try {
        // INICIAR TRANSACCIÓN MONETARIA ATÓMICA
        await pool.query('BEGIN');

        // 1. Obtener el balance actual bloqueando la fila (FOR UPDATE) para evitar Race Conditions
        const userRes = await pool.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [user_id]);

        if (userRes.rows.length === 0) {
            await pool.query('ROLLBACK'); // Cancelar si el usuario no existe
            return res.status(404).json({ error: 'user_not_found' });
        }

        const oldBalance = Number(userRes.rows[0].balance);
        let newBalance = oldBalance;

        // 2. Procesar la operación lógica de negocio
        if (operation === 'debit') {
            if (oldBalance < amount) {
                await pool.query('ROLLBACK'); // Cancelar si no tiene fondos suficientes
                return res.status(400).json({ error: 'insufficient_funds' });
            }
            newBalance = oldBalance - Number(amount);
        } else if (operation === 'credit') {
            newBalance = oldBalance + Number(amount);
        } else {
            await pool.query('ROLLBACK');
            return res.status(400).json({ error: 'Operación no válida (debe ser debit o credit)' });
        }

        // 3. Aplicar el cambio definitivo en la base de datos
        await pool.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, user_id]);
        
        // CONFIRMAR TRANSACCIÓN
        await pool.query('COMMIT');

        // Retornar la respuesta estructurada tal como lo pide el requerimiento
        res.status(200).json({
            user_id: Number(user_id),
            old_balance: oldBalance,
            new_balance: newBalance
        });

    } catch (err) {
        // Si cualquier cosa falla a nivel eléctrico o de código, revertimos para no perder dinero
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error interno al actualizar balance' });
    }
});
app.listen(PORT, () => {
    console.log(`✅ Accounts Service corriendo en el puerto ${PORT}`);
});
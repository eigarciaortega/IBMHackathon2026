const express = require('express');
const { Pool } = require('pg');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { verificarToken, soloAdmin, colaboradorOAdmin } = require('./src/middleware/auth.middleware');

const app = express();
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || 'alpha_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'officespace',
  password: process.env.DB_PASSWORD || 'AlphaPassword123',
  port: process.env.DB_PORT || 5432,
});

// ─── Swagger ──────────────────────────────────────────────────────────────────
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Catalog Service API', version: '1.0.0',
            description: 'Gestión de espacios (salas y escritorios)' },
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
  },
  apis: ['./server.js'],
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ─── Rutas ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /spaces:
 *   get:
 *     summary: Listar todos los espacios (con filtros opcionales)
 *     security: [{bearerAuth: []}]
 *     tags: [Espacios]
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema: { type: string, enum: [SALA, DESK] }
 *         description: Filtrar por tipo
 *       - in: query
 *         name: capacidad_min
 *         schema: { type: integer }
 *         description: Capacidad mínima requerida
 *     responses:
 *       200:
 *         description: Lista de espacios
 *       401:
 *         description: No autorizado
 */
app.get('/spaces', verificarToken, colaboradorOAdmin, async (req, res) => {
  try {
    const { tipo, capacidad_min } = req.query;
    let query = 'SELECT * FROM espacios WHERE 1=1';
    const params = [];

    if (tipo) {
      params.push(tipo.toUpperCase());
      query += ` AND tipo = $${params.length}`;
    }
    if (capacidad_min) {
      params.push(parseInt(capacidad_min));
      query += ` AND capacidad >= $${params.length}`;
    }

    const resultado = await pool.query(query, params);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los espacios' });
  }
});

/**
 * @swagger
 * /spaces/{id}:
 *   get:
 *     summary: Obtener un espacio por ID
 *     security: [{bearerAuth: []}]
 *     tags: [Espacios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Datos del espacio
 *       404:
 *         description: Espacio no encontrado
 */
app.get('/spaces/:id', verificarToken, colaboradorOAdmin, async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM espacios WHERE id = $1', [req.params.id]);
    if (resultado.rows.length === 0) return res.status(404).json({ error: 'Espacio no encontrado' });
    res.json(resultado.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el espacio' });
  }
});

/**
 * @swagger
 * /spaces:
 *   post:
 *     summary: Crear un nuevo espacio (solo Admin)
 *     security: [{bearerAuth: []}]
 *     tags: [Espacios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, tipo, capacidad, piso]
 *             properties:
 *               nombre: { type: string, example: "Sala Norte" }
 *               tipo: { type: string, enum: [SALA, DESK] }
 *               capacidad: { type: integer, example: 10 }
 *               recursos: { type: string, example: "Proyector, Pizarrón" }
 *               piso: { type: string, example: "Piso 3" }
 *     responses:
 *       201:
 *         description: Espacio creado
 *       403:
 *         description: Solo administradores pueden crear espacios
 */
app.post('/spaces', verificarToken, soloAdmin, async (req, res) => {
  const { nombre, tipo, capacidad, recursos, piso } = req.body;
  if (!nombre || !tipo || !capacidad || !piso) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, tipo, capacidad, piso' });
  }
  try {
    const resultado = await pool.query(
      'INSERT INTO espacios (nombre, tipo, capacidad, recursos, piso) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre, tipo.toUpperCase(), capacidad, recursos || null, piso]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el espacio' });
  }
});

/**
 * @swagger
 * /spaces/{id}:
 *   put:
 *     summary: Actualizar un espacio (solo Admin)
 *     security: [{bearerAuth: []}]
 *     tags: [Espacios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: string }
 *               tipo: { type: string, enum: [SALA, DESK] }
 *               capacidad: { type: integer }
 *               recursos: { type: string }
 *               piso: { type: string }
 *     responses:
 *       200:
 *         description: Espacio actualizado
 *       404:
 *         description: Espacio no encontrado
 */
app.put('/spaces/:id', verificarToken, soloAdmin, async (req, res) => {
  const { nombre, tipo, capacidad, recursos, piso } = req.body;
  try {
    const resultado = await pool.query(
      `UPDATE espacios SET
        nombre = COALESCE($1, nombre),
        tipo = COALESCE($2, tipo),
        capacidad = COALESCE($3, capacidad),
        recursos = COALESCE($4, recursos),
        piso = COALESCE($5, piso)
       WHERE id = $6 RETURNING *`,
      [nombre, tipo, capacidad, recursos, piso, req.params.id]
    );
    if (resultado.rows.length === 0) return res.status(404).json({ error: 'Espacio no encontrado' });
    res.json(resultado.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el espacio' });
  }
});

/**
 * @swagger
 * /spaces/{id}:
 *   delete:
 *     summary: Eliminar un espacio (solo Admin)
 *     security: [{bearerAuth: []}]
 *     tags: [Espacios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Espacio eliminado
 *       404:
 *         description: Espacio no encontrado
 */
app.delete('/spaces/:id', verificarToken, soloAdmin, async (req, res) => {
  try {
    const resultado = await pool.query('DELETE FROM espacios WHERE id = $1 RETURNING *', [req.params.id]);
    if (resultado.rows.length === 0) return res.status(404).json({ error: 'Espacio no encontrado' });
    res.json({ message: 'Espacio eliminado correctamente', espacio: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el espacio' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'catalog-service' }));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🏢 catalog-service corriendo en el puerto ${PORT}`);
  console.log(`📚 Swagger en http://localhost:${PORT}/api-docs`);
});

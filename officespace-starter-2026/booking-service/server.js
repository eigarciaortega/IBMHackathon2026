const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi   = require('swagger-ui-express');
const { verificarToken, colaboradorOAdmin, soloAdmin } = require('./src/middleware/auth.middleware');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(express.json());

const pool = new Pool({
  user:     process.env.DB_USER     || 'alpha_user',
  host:     process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME     || 'officespace',
  password: process.env.DB_PASSWORD || 'AlphaPassword123',
  port:     process.env.DB_PORT     || 5432,
});

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Booking Service API', version: '1.0.0',
            description: 'Motor de reservas con validacion de solapamiento y WebSockets' },
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
  },
  apis: ['./server.js'],
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  socket.on('disconnect', () => console.log(`Cliente desconectado: ${socket.id}`));
});

function notificar(evento, datos) {
  io.emit(evento, datos);
}

setInterval(async () => {
  try {
    const ahora = new Date();
    const en16  = new Date(ahora.getTime() + 16 * 60 * 1000);
    const hoy   = ahora.toISOString().split('T')[0];
    const pad   = n => String(n).padStart(2,'0');
    const hAhora = `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;
    const h16    = `${pad(en16.getHours())}:${pad(en16.getMinutes())}`;

    const result = await pool.query(
      `SELECT r.*, e.nombre AS espacio_nombre, u.email
       FROM reservas r
       JOIN espacios e ON r.space_id = e.id
       JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.fecha = $1 AND r.hora_inicio > $2 AND r.hora_inicio <= $3`,
      [hoy, hAhora, h16]
    );

    result.rows.forEach(r => {
      const inicio = (r.hora_inicio || '').slice(0,5);
      notificar('recordatorio', {
        mensaje: `Recordatorio: tu reserva en "${r.espacio_nombre}" empieza a las ${inicio}`,
        reserva_id: r.id,
        usuario_email: r.email,
      });
    });
  } catch (e) { console.error('Error en recordatorio:', e.message); }
}, 60 * 1000);

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Crear una reserva (valida solapamiento, capacidad y fecha)
 *     security: [{bearerAuth: []}]
 *     tags: [Reservas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [space_id, fecha, hora_inicio, hora_fin, asistentes]
 *             properties:
 *               space_id: { type: integer, example: 1 }
 *               fecha: { type: string, format: date, example: "2026-07-01" }
 *               hora_inicio: { type: string, example: "09:00" }
 *               hora_fin: { type: string, example: "11:00" }
 *               asistentes: { type: integer, example: 4 }
 *     responses:
 *       201: { description: Reserva creada }
 *       400: { description: Error de validacion }
 *       409: { description: Conflicto de horario }
 *       401: { description: No autorizado }
 */
app.post('/bookings', verificarToken, colaboradorOAdmin, async (req, res) => {
  const { space_id, fecha, hora_inicio, hora_fin, asistentes } = req.body;
  const usuario_id = req.usuario.id;

  if (!space_id || !fecha || !hora_inicio || !hora_fin || !asistentes)
    return res.status(400).json({ error: 'Faltan campos: space_id, fecha, hora_inicio, hora_fin, asistentes' });

  const hoy = new Date(); hoy.setHours(0,0,0,0);
  if (new Date(fecha + 'T00:00:00') < hoy)
    return res.status(400).json({ error: 'No se pueden crear reservas en fechas pasadas' });

  // Si la reserva es hoy, la hora de inicio debe ser mayor a la hora actual CDMX
  const ahoraCDMX = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  const fechaHoy = [
    ahoraCDMX.getFullYear(),
    String(ahoraCDMX.getMonth()+1).padStart(2,'0'),
    String(ahoraCDMX.getDate()).padStart(2,'0')
  ].join('-');

  if (fecha === fechaHoy) {
    const [hh, mm] = hora_inicio.split(':').map(Number);
    const minutosInicio = hh * 60 + mm;
    const minutosAhora  = ahoraCDMX.getHours() * 60 + ahoraCDMX.getMinutes();
    if (minutosInicio <= minutosAhora)
      return res.status(400).json({ error: 'La hora de inicio debe ser mayor a la hora actual' });
  }
  
  try {
    const espacioResult = await pool.query('SELECT * FROM espacios WHERE id = $1', [space_id]);
    if (espacioResult.rows.length === 0)
      return res.status(404).json({ error: 'El espacio solicitado no existe' });

    const espacio = espacioResult.rows[0];

    if (asistentes > espacio.capacidad)
      return res.status(400).json({
        error: `Capacidad excedida: el espacio "${espacio.nombre}" permite maximo ${espacio.capacidad} personas, pero solicitaste ${asistentes}`
      });

    const solapamiento = await pool.query(
      `SELECT id FROM reservas
       WHERE space_id = $1 AND fecha = $2
         AND hora_inicio < $4 AND hora_fin > $3`,
      [space_id, fecha, hora_inicio, hora_fin]
    );

    if (solapamiento.rows.length > 0)
      return res.status(409).json({
        error: `Conflicto de horario: el espacio "${espacio.nombre}" ya esta reservado en ese intervalo. Reserva en conflicto ID: ${solapamiento.rows[0].id}`
      });

    const resultado = await pool.query(
      `INSERT INTO reservas (space_id, usuario_id, fecha, hora_inicio, hora_fin, asistentes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [space_id, usuario_id, fecha, hora_inicio, hora_fin, asistentes]
    );

    const reserva = resultado.rows[0];

    notificar('reserva_confirmada', {
      mensaje: `Reserva confirmada — ${espacio.nombre}, ${fecha} de ${hora_inicio.slice(0,5)} a ${hora_fin.slice(0,5)}`,
      reserva_id: reserva.id,
      usuario_id,
      espacio_nombre: espacio.nombre,
    });

    res.status(201).json({ message: 'Reserva creada exitosamente', reserva });

  } catch (error) {
    console.error('Error en BD:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /bookings/mis-reservas:
 *   get:
 *     summary: Ver las reservas del usuario autenticado
 *     security: [{bearerAuth: []}]
 *     tags: [Reservas]
 *     responses:
 *       200: { description: Lista de reservas del usuario }
 */
app.get('/bookings/mis-reservas', verificarToken, colaboradorOAdmin, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT r.*, e.nombre AS espacio_nombre, e.tipo, e.piso
       FROM reservas r
       JOIN espacios e ON r.space_id = e.id
       WHERE r.usuario_id = $1
       ORDER BY r.fecha DESC, r.hora_inicio DESC`,
      [req.usuario.id]
    );
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las reservas' });
  }
});

/**
 * @swagger
 * /bookings/dashboard:
 *   get:
 *     summary: Ocupacion del dia de hoy
 *     security: [{bearerAuth: []}]
 *     tags: [Reservas]
 *     responses:
 *       200: { description: Reservas del dia }
 */
app.get('/bookings/dashboard', verificarToken, async (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const resultado = await pool.query(
      `SELECT r.*, e.nombre AS espacio_nombre, e.tipo, e.capacidad, u.email AS usuario_email
       FROM reservas r
       JOIN espacios e ON r.space_id = e.id
       JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.fecha = $1 ORDER BY r.hora_inicio`,
      [hoy]
    );
    res.json({ fecha: hoy, total_reservas: resultado.rows.length, reservas: resultado.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el dashboard' });
  }
});

/**
 * @swagger
 * /bookings/historial:
 *   get:
 *     summary: Historial completo de todas las reservas (solo Admin)
 *     security: [{bearerAuth: []}]
 *     tags: [Reservas]
 *     parameters:
 *       - in: query
 *         name: fecha_inicio
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: fecha_fin
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: space_id
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Historial de reservas }
 *       403: { description: Solo administradores }
 */
app.get('/bookings/historial', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, space_id } = req.query;
    let query = `
      SELECT r.*, e.nombre AS espacio_nombre, e.tipo, e.piso,
             u.email AS usuario_email, u.rol AS usuario_rol
      FROM reservas r
      JOIN espacios e ON r.space_id = e.id
      JOIN usuarios u ON r.usuario_id = u.id
      WHERE 1=1`;
    const params = [];

    if (fecha_inicio) { params.push(fecha_inicio); query += ` AND r.fecha >= $${params.length}`; }
    if (fecha_fin)    { params.push(fecha_fin);    query += ` AND r.fecha <= $${params.length}`; }
    if (space_id)     { params.push(space_id);     query += ` AND r.space_id = $${params.length}`; }

    query += ' ORDER BY r.fecha DESC, r.hora_inicio DESC';

    const resultado = await pool.query(query, params);
    res.json({ total: resultado.rows.length, reservas: resultado.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
});

/**
 * @swagger
 * /bookings/{id}:
 *   delete:
 *     summary: Cancelar una reserva (solo el dueno o admin)
 *     security: [{bearerAuth: []}]
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Reserva cancelada }
 *       403: { description: Sin permiso }
 *       404: { description: No encontrada }
 */
app.delete('/bookings/:id', verificarToken, colaboradorOAdmin, async (req, res) => {
  try {
    const reservaResult = await pool.query(
      `SELECT r.*, e.nombre AS espacio_nombre FROM reservas r
       JOIN espacios e ON r.space_id = e.id WHERE r.id = $1`,
      [req.params.id]
    );
    if (reservaResult.rows.length === 0)
      return res.status(404).json({ error: 'Reserva no encontrada' });

    const reserva = reservaResult.rows[0];

    if (reserva.usuario_id !== req.usuario.id && req.usuario.rol !== 'ADMINISTRADOR')
      return res.status(403).json({ error: 'No tienes permiso para cancelar esta reserva' });

    // Hora actual en CDMX (UTC-6)
    const ahoraCDMX = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    const hoyCDMX = [
      ahoraCDMX.getFullYear(),
      String(ahoraCDMX.getMonth()+1).padStart(2,'0'),
      String(ahoraCDMX.getDate()).padStart(2,'0')
    ].join('-');

    // fecha de la reserva viene como "2026-06-23T00:00:00.000Z"
    const fechaReserva = (reserva.fecha instanceof Date
      ? reserva.fecha.toISOString()
      : String(reserva.fecha)).split('T')[0];

    // Dia pasado — no se puede cancelar
    if (fechaReserva < hoyCDMX)
      return res.status(400).json({ error: 'No se pueden cancelar reservas pasadas' });

    // Hoy — verificar que falten mas de 15 minutos para el inicio
    if (fechaReserva === hoyCDMX) {
      const partes = String(reserva.hora_inicio || '00:00:00').split(':').map(Number);
      const minutosInicio = partes[0] * 60 + partes[1];
      const minutosAhora  = ahoraCDMX.getHours() * 60 + ahoraCDMX.getMinutes();
      if (minutosAhora >= minutosInicio - 15)
        return res.status(400).json({ error: 'Solo puedes cancelar con al menos 15 minutos de anticipacion' });
    }

    await pool.query('DELETE FROM reservas WHERE id = $1', [req.params.id]);

    notificar('reserva_cancelada', {
      mensaje: `Reserva cancelada — ${reserva.espacio_nombre}, ${reserva.fecha}`,
      reserva_id: reserva.id,
      usuario_id: reserva.usuario_id,
    });

    res.json({ message: 'Reserva cancelada correctamente' });
  } catch (error) {
    console.error('Error al cancelar:', error);
    res.status(500).json({ error: 'Error al cancelar la reserva' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'booking-service' }));

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`booking-service corriendo en el puerto ${PORT}`);
  console.log(`WebSocket activo en ws://localhost:${PORT}`);
  console.log(`Swagger en http://localhost:${PORT}/api-docs`);
});
const router = require('express').Router();
const controller = require('../controllers/bookingController');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');

/**
 * @swagger
 * /bookings/available:
 *   get:
 *     summary: Obtener espacios disponibles en un horario
 *     tags: [Reservaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hora_entrada
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         example: "2026-06-23T09:00:00.000Z"
 *       - in: query
 *         name: hora_salida
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         example: "2026-06-23T10:00:00.000Z"
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [SALA, DESK]
 *       - in: query
 *         name: capacidad
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de espacios disponibles
 *       400:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/available', verifyToken, controller.getAvailable);

/**
 * @swagger
 * /bookings/mine:
 *   get:
 *     summary: Obtener mis reservas
 *     tags: [Reservaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reservas del usuario autenticado
 */
router.get('/mine', verifyToken, controller.getMine);

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Crear una reserva
 *     tags: [Reservaciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [espacio_id, hora_entrada, hora_salida, asistentes]
 *             properties:
 *               espacio_id:   { type: integer, example: 2 }
 *               hora_entrada: { type: string, format: date-time }
 *               hora_salida:  { type: string, format: date-time }
 *               asistentes:   { type: integer, example: 5 }
 *     responses:
 *       201:
 *         description: Reserva creada exitosamente
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       409:
 *         description: Conflicto - el espacio ya está reservado en ese horario
 */
router.post('/', verifyToken, controller.create);

/**
 * @swagger
 * /bookings/{id}:
 *   delete:
 *     summary: Cancelar una reserva
 *     tags: [Reservaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reserva cancelada
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.delete('/:id', verifyToken, controller.cancel);

/**
 * @swagger
 * /bookings/today:
 *   get:
 *     summary: Dashboard de reservas de hoy (solo Admin)
 *     tags: [Reservaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reservas del día actual
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/today', verifyToken, verifyAdmin, controller.getToday);

/**
 * @swagger
 * /bookings/by-date:
 *   get:
 *     summary: Obtener reservas por fecha específica (solo Admin)
 *     tags: [Reservaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fecha
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-06-25"
 *         description: Fecha en formato YYYY-MM-DD
 *     responses:
 *       200:
 *         description: Lista de reservas para la fecha especificada
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/by-date', verifyToken, verifyAdmin, controller.getByDate);

module.exports = router;
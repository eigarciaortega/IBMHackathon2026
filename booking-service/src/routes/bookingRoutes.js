const express = require("express");
const { body } = require("express-validator");
const { authenticate, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/bookingController");

const router = express.Router();

const createValidators = [
  body("space_id").isInt({ min: 1 }),
  body("booking_date").matches(/^\d{4}-\d{2}-\d{2}$/),
  body("start_time").matches(/^\d{2}:\d{2}(:\d{2})?$/),
  body("end_time").matches(/^\d{2}:\d{2}(:\d{2})?$/),
  body("attendees").isInt({ min: 1 }),
  body("reminder_phone").optional().isString().trim().isLength({ min: 8, max: 24 }),
  body("reminder_channels").optional(),
];

/**
 * @openapi
 * /availability:
 *   get:
 *     tags: [Disponibilidad]
 *     summary: Busca espacios disponibles en un rango de fecha/hora
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: date, required: true, schema: { type: string, format: date } }
 *       - { in: query, name: start, required: true, schema: { type: string, example: '09:00' } }
 *       - { in: query, name: end, required: true, schema: { type: string, example: '10:00' } }
 *       - { in: query, name: type, schema: { type: string, enum: [SALA, ESCRITORIO] } }
 *       - { in: query, name: minCapacity, schema: { type: integer } }
 *     responses:
 *       200: { description: Espacios disponibles }
 *       400: { description: Parámetros inválidos }
 */
router.get("/availability", authenticate, ctrl.searchAvailability);

/**
 * @openapi
 * /bookings:
 *   post:
 *     tags: [Reservas]
 *     summary: Crea una reserva (valida solapamiento, capacidad, fecha y horario)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ReservaInput' }
 *     responses:
 *       201: { description: Reserva creada }
 *       400: { description: Validación fallida }
 *       401: { description: No autenticado }
 *       404: { description: Espacio no encontrado }
 *       409: { description: Solapamiento de horario }
 */
router.post("/bookings", authenticate, createValidators, ctrl.createBooking);

/**
 * @openapi
 * /bookings/me:
 *   get:
 *     tags: [Reservas]
 *     summary: Lista las reservas del usuario autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Reservas del usuario }
 */
router.get("/bookings/me", authenticate, ctrl.myBookings);

/**
 * @openapi
 * /bookings/occupancy:
 *   get:
 *     tags: [Reservas]
 *     summary: Ocupación del día (dashboard)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: date, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: Resumen de ocupación }
 */
router.get("/bookings/occupancy", authenticate, ctrl.occupancy);

/**
 * @openapi
 * /bookings/calendar:
 *   get:
 *     tags: [Reservas]
 *     summary: Lista reservas confirmadas para pintar el calendario interno
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: start, schema: { type: string, format: date } }
 *       - { in: query, name: end, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: Reservas confirmadas del rango solicitado }
 *       400: { description: Rango inválido }
 */
router.get("/bookings/calendar", authenticate, ctrl.calendarBookings);

/**
 * @openapi
 * /bookings/calendar/embed:
 *   get:
 *     tags: [Reservas]
 *     summary: Configuración del Google Calendar embebido (URL para iframe)
 *     description: >
 *       Devuelve la URL para embeber el calendario de Google compartido donde se
 *       ven todas las reservas (admin y colaboradores). Disponible para ambos roles.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Configuración del calendario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 configured: { type: boolean }
 *                 embedUrl:   { type: string }
 *                 timeZone:   { type: string }
 *                 calendarId: { type: string, nullable: true }
 */
router.get("/bookings/calendar/embed", authenticate, ctrl.calendarEmbed);

/**
 * @openapi
 * /bookings/analytics:
 *   get:
 *     tags: [Analítica]
 *     summary: Métricas de uso (espacios top, horas pico, tasa de cancelación)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Métricas }
 *       403: { description: Solo administradores }
 */
router.get(
  "/bookings/analytics",
  authenticate,
  requireRole("ADMINISTRADOR"),
  ctrl.analytics,
);

/**
 * @openapi
 * /bookings/suggestions:
 *   get:
 *     tags: [Analítica]
 *     summary: Sugiere franjas horarias libres óptimas
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: date, schema: { type: string, format: date } }
 *       - { in: query, name: duration, schema: { type: integer, example: 60 } }
 *       - { in: query, name: type, schema: { type: string, enum: [SALA, ESCRITORIO] } }
 *       - { in: query, name: minCapacity, schema: { type: integer } }
 *     responses:
 *       200: { description: Sugerencias }
 */
router.get("/bookings/suggestions", authenticate, ctrl.suggestions);

/**
 * @openapi
 * /bookings/export-data:
 *   get:
 *     tags: [Importacion/Exportacion]
 *     summary: Exporta espacios y reservas para Excel o CSV (solo ADMINISTRADOR)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Datos completos para generar archivo de intercambio
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exportedAt: { type: string, format: date-time }
 *                 spaces: { type: array, items: { type: object } }
 *                 bookings: { type: array, items: { type: object } }
 *       403: { description: Solo administradores }
 */
router.get(
  "/bookings/export-data",
  authenticate,
  requireRole("ADMINISTRADOR"),
  ctrl.exportData,
);

/**
 * @openapi
 * /bookings/import-data:
 *   post:
 *     tags: [Importacion/Exportacion]
 *     summary: Importa y fusiona espacios/reservas desde Excel o CSV parseado (solo ADMINISTRADOR)
 *     description: >
 *       Recibe arreglos JSON `spaces` y `bookings`. Los espacios se crean o actualizan por id/nombre.
 *       Las reservas se crean o actualizan por id o por espacio+usuario+fecha+horario. Las reservas
 *       conflictivas se omiten y se reportan en `errors`.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               spaces: { type: array, items: { type: object } }
 *               bookings: { type: array, items: { type: object } }
 *     responses:
 *       200: { description: Resumen de filas creadas, actualizadas y omitidas }
 *       400: { description: Formato invalido }
 *       403: { description: Solo administradores }
 */
router.post(
  "/bookings/import-data",
  authenticate,
  requireRole("ADMINISTRADOR"),
  ctrl.importData,
);

/**
 * @openapi
 * /bookings/{id}:
 *   delete:
 *     tags: [Reservas]
 *     summary: Cancela una reserva futura (dueño o admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Cancelada }
 *       400: { description: Solo futuras }
 *       403: { description: Sin permiso }
 *       404: { description: No encontrada }
 */
router.delete("/bookings/:id", authenticate, ctrl.cancelBooking);

module.exports = router;

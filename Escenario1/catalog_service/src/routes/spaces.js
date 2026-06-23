const router = require('express').Router();
const controller = require('../controllers/spacesController');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');

/**
 * @swagger
 * /spaces:
 *   get:
 *     summary: Obtener todos los espacios disponibles
 *     tags: [Espacios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [SALA, DESK]
 *         description: Filtrar por tipo de espacio
 *       - in: query
 *         name: capacidad
 *         schema:
 *           type: integer
 *         description: Capacidad mínima requerida
 *     responses:
 *       200:
 *         description: Lista de espacios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Espacio'
 *       401:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/', verifyToken, controller.getAll);

/**
 * @swagger
 * /spaces/{id}:
 *   get:
 *     summary: Obtener espacio por ID
 *     tags: [Espacios]
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
 *         description: Espacio encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Espacio'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/:id', verifyToken, controller.getById);

/**
 * @swagger
 * /spaces:
 *   post:
 *     summary: Crear nuevo espacio (solo Admin)
 *     tags: [Espacios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, tipo, capacidad]
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Sala de Prueba"
 *               tipo:
 *                 type: string
 *                 enum: [SALA, DESK]
 *               capacidad:
 *                 type: integer
 *                 example: 6
 *               piso:
 *                 type: string
 *                 example: "Piso 1"
 *               con_proyector:
 *                 type: boolean
 *                 example: true
 *               con_aire:
 *                 type: boolean
 *                 example: false
 *               con_pizarron:
 *                 type: boolean
 *                 example: false
 *               con_tv:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Espacio creado
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.post('/', verifyToken, verifyAdmin, controller.create);

/**
 * @swagger
 * /spaces/{id}:
 *   put:
 *     summary: Actualizar espacio (solo Admin)
 *     tags: [Espacios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Espacio'
 *     responses:
 *       200:
 *         description: Espacio actualizado
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.put('/:id', verifyToken, verifyAdmin, controller.update);

/**
 * @swagger
 * /spaces/{id}:
 *   delete:
 *     summary: Eliminar espacio - soft delete (solo Admin)
 *     tags: [Espacios]
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
 *         description: Espacio eliminado
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.delete('/:id', verifyToken, verifyAdmin, controller.remove);

module.exports = router;
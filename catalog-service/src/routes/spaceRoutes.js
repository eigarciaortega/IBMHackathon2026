const express = require('express')
const { body } = require('express-validator')
const { authenticate, requireRole } = require('../middleware/auth')
const ctrl = require('../controllers/spaceController')

const router = express.Router()

const spaceValidators = [
  body('name').optional().isString().trim().isLength({ min: 2 }),
  body('type').optional().isIn(['SALA', 'ESCRITORIO']),
  body('capacity').optional().isInt({ min: 1 }),
  body('floor').optional().isString().trim().notEmpty(),
]
const createValidators = [
  body('name').isString().trim().isLength({ min: 2 }),
  body('type').isIn(['SALA', 'ESCRITORIO']),
  body('capacity').isInt({ min: 1 }),
  body('floor').isString().trim().notEmpty(),
]

/**
 * @openapi
 * /spaces:
 *   get:
 *     tags: [Espacios]
 *     summary: Lista espacios con filtros opcionales
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [SALA, ESCRITORIO] }
 *       - in: query
 *         name: minCapacity
 *         schema: { type: integer }
 *       - in: query
 *         name: projector
 *         schema: { type: boolean }
 *       - in: query
 *         name: ac
 *         schema: { type: boolean }
 *       - in: query
 *         name: videoconference
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Lista de espacios
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Espacio' } }
 *       401: { description: No autenticado }
 */
router.get('/', authenticate, ctrl.listSpaces)

/**
 * @openapi
 * /spaces/{id}:
 *   get:
 *     tags: [Espacios]
 *     summary: Obtiene un espacio por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Espacio }
 *       404: { description: No encontrado }
 */
router.get('/:id', authenticate, ctrl.getSpace)

/**
 * @openapi
 * /spaces:
 *   post:
 *     tags: [Espacios]
 *     summary: Crea un espacio (solo ADMINISTRADOR)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EspacioInput' }
 *     responses:
 *       201: { description: Espacio creado }
 *       400: { description: Datos inválidos }
 *       403: { description: Permisos insuficientes }
 */
router.post('/', authenticate, requireRole('ADMINISTRADOR'), createValidators, ctrl.createSpace)

/**
 * @openapi
 * /spaces/{id}:
 *   put:
 *     tags: [Espacios]
 *     summary: Actualiza un espacio (solo ADMINISTRADOR)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EspacioInput' }
 *     responses:
 *       200: { description: Espacio actualizado }
 *       403: { description: Permisos insuficientes }
 *       404: { description: No encontrado }
 */
router.put('/:id', authenticate, requireRole('ADMINISTRADOR'), spaceValidators, ctrl.updateSpace)

/**
 * @openapi
 * /spaces/{id}:
 *   delete:
 *     tags: [Espacios]
 *     summary: Elimina un espacio (solo ADMINISTRADOR)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Eliminado }
 *       403: { description: Permisos insuficientes }
 *       404: { description: No encontrado }
 */
router.delete('/:id', authenticate, requireRole('ADMINISTRADOR'), ctrl.deleteSpace)

module.exports = router

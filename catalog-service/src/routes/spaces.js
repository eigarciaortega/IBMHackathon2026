const express = require('express');
const router = express.Router();
const spacesController = require('../controllers/spacesController');
const { body } = require('express-validator');

const spaceValidationRules = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('description').trim().notEmpty().withMessage('La descripción es requerida'),
  body('address').trim().notEmpty().withMessage('La dirección es requerida'),
  body('city').trim().notEmpty().withMessage('La ciudad es requerida'),
  body('state').trim().notEmpty().withMessage('El estado es requerido'),
  body('country').trim().notEmpty().withMessage('El país es requerido'),
  body('postal_code').trim().notEmpty().withMessage('El código postal es requerido'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida'),
  body('capacity').isInt({ min: 1 }).withMessage('La capacidad debe ser al menos 1'),
  body('price_per_hour').isFloat({ min: 0 }).withMessage('El precio debe ser mayor o igual a 0'),
  body('space_type').isIn(['office', 'meeting_room', 'coworking', 'event_space', 'private_office'])
    .withMessage('Tipo de espacio inválido'),
  body('owner_id').isInt().withMessage('ID de propietario inválido'),
  body('amenities').optional().isArray().withMessage('Las amenidades deben ser un array')
];

const updateValidationRules = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('description').optional().trim().notEmpty().withMessage('La descripción no puede estar vacía'),
  body('address').optional().trim().notEmpty().withMessage('La dirección no puede estar vacía'),
  body('city').optional().trim().notEmpty().withMessage('La ciudad no puede estar vacía'),
  body('state').optional().trim().notEmpty().withMessage('El estado no puede estar vacío'),
  body('country').optional().trim().notEmpty().withMessage('El país no puede estar vacío'),
  body('postal_code').optional().trim().notEmpty().withMessage('El código postal no puede estar vacío'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('La capacidad debe ser al menos 1'),
  body('price_per_hour').optional().isFloat({ min: 0 }).withMessage('El precio debe ser mayor o igual a 0'),
  body('space_type').optional().isIn(['office', 'meeting_room', 'coworking', 'event_space', 'private_office'])
    .withMessage('Tipo de espacio inválido'),
  body('status').optional().isIn(['active', 'inactive', 'maintenance']).withMessage('Estado inválido'),
  body('amenities').optional().isArray().withMessage('Las amenidades deben ser un array')
];

router.get('/', spacesController.getAllSpaces);

router.get('/amenities', spacesController.getAmenities);

router.get('/:id', spacesController.getSpaceById);

router.get('/:id/availability', spacesController.checkAvailability);

router.post('/', spaceValidationRules, spacesController.createSpace);

router.put('/:id', updateValidationRules, spacesController.updateSpace);

router.delete('/:id', spacesController.deleteSpace);

module.exports = router;

// Made with Bob

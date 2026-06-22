const { body, query } = require('express-validator');

const createBookingValidation = [
  body('space_id').isInt({ min: 1 }).withMessage('ID de espacio inválido'),
  body('user_id').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
  body('start_time').isISO8601().withMessage('Fecha de inicio inválida'),
  body('end_time').isISO8601().withMessage('Fecha de fin inválida'),
  body('attendees').isInt({ min: 1 }).withMessage('Número de asistentes debe ser al menos 1'),
  body('purpose').optional().trim().notEmpty().withMessage('El propósito no puede estar vacío'),
  body('special_requirements').optional().trim()
];

const updateBookingValidation = [
  body('start_time').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  body('end_time').optional().isISO8601().withMessage('Fecha de fin inválida'),
  body('attendees').optional().isInt({ min: 1 }).withMessage('Número de asistentes debe ser al menos 1'),
  body('purpose').optional().trim().notEmpty().withMessage('El propósito no puede estar vacío'),
  body('special_requirements').optional().trim(),
  body('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed'])
    .withMessage('Estado inválido')
];

const queryBookingsValidation = [
  query('user_id').optional().isInt({ min: 1 }).withMessage('ID de usuario inválido'),
  query('space_id').optional().isInt({ min: 1 }).withMessage('ID de espacio inválido'),
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed'])
    .withMessage('Estado inválido'),
  query('start_date').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  query('end_date').optional().isISO8601().withMessage('Fecha de fin inválida')
];

module.exports = {
  createBookingValidation,
  updateBookingValidation,
  queryBookingsValidation
};

// Made with Bob

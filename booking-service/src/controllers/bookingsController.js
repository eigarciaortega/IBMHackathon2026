const Booking = require('../models/Booking');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class BookingsController {
  async getAllBookings(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const filters = {
        user_id: req.query.user_id ? parseInt(req.query.user_id) : undefined,
        space_id: req.query.space_id ? parseInt(req.query.space_id) : undefined,
        status: req.query.status,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const bookings = await Booking.findAll(filters);
      
      logger.info(`Retrieved ${bookings.length} bookings with filters`, { filters });
      
      res.json({
        success: true,
        count: bookings.length,
        data: bookings
      });
    } catch (error) {
      logger.error('Error fetching bookings:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener las reservas',
        message: error.message
      });
    }
  }

  async getBookingById(req, res) {
    try {
      const { id } = req.params;
      const booking = await Booking.findById(id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Reserva no encontrada'
        });
      }

      logger.info(`Retrieved booking ${id}`);
      
      res.json({
        success: true,
        data: booking
      });
    } catch (error) {
      logger.error(`Error fetching booking ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener la reserva',
        message: error.message
      });
    }
  }

  async createBooking(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const bookingData = {
        space_id: req.body.space_id,
        user_id: req.body.user_id,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        attendees: req.body.attendees,
        purpose: req.body.purpose,
        special_requirements: req.body.special_requirements
      };

      const booking = await Booking.create(bookingData);
      
      logger.info(`Created new booking ${booking.id}`, { bookingData });
      
      res.status(201).json({
        success: true,
        message: 'Reserva creada exitosamente',
        data: booking
      });
    } catch (error) {
      logger.error('Error creating booking:', error);
      
      if (error.message.includes('disponible') || 
          error.message.includes('capacidad') ||
          error.message.includes('pasado') ||
          error.message.includes('anterior')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error al crear la reserva',
        message: error.message
      });
    }
  }

  async updateBooking(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      
      const updateData = {};
      const allowedFields = [
        'start_time', 'end_time', 'attendees', 'purpose',
        'special_requirements', 'status'
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      const booking = await Booking.update(id, updateData);
      
      logger.info(`Updated booking ${id}`, { updateData });
      
      res.json({
        success: true,
        message: 'Reserva actualizada exitosamente',
        data: booking
      });
    } catch (error) {
      logger.error(`Error updating booking ${req.params.id}:`, error);
      
      if (error.message.includes('no encontrada') ||
          error.message.includes('cancelada') ||
          error.message.includes('completada') ||
          error.message.includes('disponible') ||
          error.message.includes('capacidad') ||
          error.message.includes('pasado') ||
          error.message.includes('anterior')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error al actualizar la reserva',
        message: error.message
      });
    }
  }

  async cancelBooking(req, res) {
    try {
      const { id } = req.params;
      const booking = await Booking.cancel(id);
      
      logger.info(`Cancelled booking ${id}`);
      
      res.json({
        success: true,
        message: 'Reserva cancelada exitosamente',
        data: booking
      });
    } catch (error) {
      logger.error(`Error cancelling booking ${req.params.id}:`, error);
      
      if (error.message.includes('no encontrada') ||
          error.message.includes('cancelada') ||
          error.message.includes('completada')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error al cancelar la reserva',
        message: error.message
      });
    }
  }

  async getUserStatistics(req, res) {
    try {
      const { userId } = req.params;
      const statistics = await Booking.getStatistics(userId);
      
      logger.info(`Retrieved statistics for user ${userId}`);
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error(`Error fetching statistics for user ${req.params.userId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener estadísticas',
        message: error.message
      });
    }
  }
}

module.exports = new BookingsController();

// Made with Bob

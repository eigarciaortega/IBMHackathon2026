const Space = require('../models/Space');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class SpacesController {
  async getAllSpaces(req, res) {
    try {
      const filters = {
        city: req.query.city,
        capacity: req.query.capacity ? parseInt(req.query.capacity) : undefined,
        priceMin: req.query.priceMin ? parseFloat(req.query.priceMin) : undefined,
        priceMax: req.query.priceMax ? parseFloat(req.query.priceMax) : undefined,
        amenities: req.query.amenities ? req.query.amenities.split(',') : undefined,
        available: req.query.available
      };

      const spaces = await Space.findAll(filters);
      
      logger.info(`Retrieved ${spaces.length} spaces with filters`, { filters });
      
      res.json({
        success: true,
        count: spaces.length,
        data: spaces
      });
    } catch (error) {
      logger.error('Error fetching spaces:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener los espacios',
        message: error.message
      });
    }
  }

  async getSpaceById(req, res) {
    try {
      const { id } = req.params;
      const space = await Space.findById(id);

      if (!space) {
        return res.status(404).json({
          success: false,
          error: 'Espacio no encontrado'
        });
      }

      logger.info(`Retrieved space ${id}`);
      
      res.json({
        success: true,
        data: space
      });
    } catch (error) {
      logger.error(`Error fetching space ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener el espacio',
        message: error.message
      });
    }
  }

  async createSpace(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const spaceData = {
        name: req.body.name,
        description: req.body.description,
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        country: req.body.country,
        postal_code: req.body.postal_code,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        capacity: req.body.capacity,
        price_per_hour: req.body.price_per_hour,
        space_type: req.body.space_type,
        owner_id: req.body.owner_id,
        amenities: req.body.amenities || []
      };

      const space = await Space.create(spaceData);
      
      logger.info(`Created new space ${space.id}`, { spaceData });
      
      res.status(201).json({
        success: true,
        message: 'Espacio creado exitosamente',
        data: space
      });
    } catch (error) {
      logger.error('Error creating space:', error);
      res.status(500).json({
        success: false,
        error: 'Error al crear el espacio',
        message: error.message
      });
    }
  }

  async updateSpace(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const existingSpace = await Space.findById(id);

      if (!existingSpace) {
        return res.status(404).json({
          success: false,
          error: 'Espacio no encontrado'
        });
      }

      const updateData = {};
      const allowedFields = [
        'name', 'description', 'address', 'city', 'state', 'country',
        'postal_code', 'latitude', 'longitude', 'capacity', 'price_per_hour',
        'space_type', 'status', 'amenities'
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      const space = await Space.update(id, updateData);
      
      logger.info(`Updated space ${id}`, { updateData });
      
      res.json({
        success: true,
        message: 'Espacio actualizado exitosamente',
        data: space
      });
    } catch (error) {
      logger.error(`Error updating space ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar el espacio',
        message: error.message
      });
    }
  }

  async deleteSpace(req, res) {
    try {
      const { id } = req.params;
      const existingSpace = await Space.findById(id);

      if (!existingSpace) {
        return res.status(404).json({
          success: false,
          error: 'Espacio no encontrado'
        });
      }

      await Space.delete(id);
      
      logger.info(`Deleted space ${id}`);
      
      res.json({
        success: true,
        message: 'Espacio eliminado exitosamente'
      });
    } catch (error) {
      logger.error(`Error deleting space ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar el espacio',
        message: error.message
      });
    }
  }

  async checkAvailability(req, res) {
    try {
      const { id } = req.params;
      const { start_time, end_time } = req.query;

      if (!start_time || !end_time) {
        return res.status(400).json({
          success: false,
          error: 'Se requieren start_time y end_time'
        });
      }

      const space = await Space.findById(id);
      if (!space) {
        return res.status(404).json({
          success: false,
          error: 'Espacio no encontrado'
        });
      }

      const isAvailable = await Space.checkAvailability(id, start_time, end_time);
      
      logger.info(`Checked availability for space ${id}`, { start_time, end_time, isAvailable });
      
      res.json({
        success: true,
        data: {
          space_id: id,
          start_time,
          end_time,
          available: isAvailable
        }
      });
    } catch (error) {
      logger.error(`Error checking availability for space ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error al verificar disponibilidad',
        message: error.message
      });
    }
  }

  async getAmenities(req, res) {
    try {
      const amenities = await Space.getAmenities();
      
      res.json({
        success: true,
        count: amenities.length,
        data: amenities
      });
    } catch (error) {
      logger.error('Error fetching amenities:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener amenidades',
        message: error.message
      });
    }
  }
}

module.exports = new SpacesController();

// Made with Bob

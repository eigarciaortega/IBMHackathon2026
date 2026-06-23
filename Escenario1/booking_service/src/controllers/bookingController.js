const bookingService = require('../services/bookingService');

const getMine = async (req, res) => {
  try {
    const bookings = await bookingService.getAll(req.user.id);
    res.json(bookings);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getToday = async (req, res) => {
  try {
    const bookings = await bookingService.getToday();
    res.json(bookings);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

/**
 * NUEVO: Obtener reservas por fecha específica
 * Query param: fecha (formato YYYY-MM-DD)
 * Solo para administradores
 */
const getByDate = async (req, res) => {
  try {
    const { fecha } = req.query;
    
    if (!fecha) {
      return res.status(400).json({ error: 'El parámetro fecha es obligatorio (formato: YYYY-MM-DD)' });
    }

    // Validar formato de fecha
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fecha)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }

    const bookings = await bookingService.getByDate(fecha);
    res.json(bookings);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { espacio_id, hora_entrada, hora_salida, asistentes } = req.body;

    if (!espacio_id || !hora_entrada || !hora_salida || !asistentes) {
      return res.status(400).json({ 
        error: 'espacio_id, hora_entrada, hora_salida y asistentes son obligatorios' 
      });
    }

    const booking = await bookingService.create({
      espacio_id,
      usuario_id: req.user.id,
      hora_entrada,
      hora_salida,
      asistentes
    });

    res.status(201).json({ message: 'Reserva creada exitosamente', booking });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const cancel = async (req, res) => {
  try {
    const booking = await bookingService.cancel(req.params.id, req.user.id);
    res.json({ message: 'Reserva cancelada exitosamente', booking });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getAvailable = async (req, res) => {
  try {
    const { hora_entrada, hora_salida, tipo, capacidad } = req.query;

    if (!hora_entrada || !hora_salida) {
      return res.status(400).json({ error: 'hora_entrada y hora_salida son obligatorios' });
    }

    const spaces = await bookingService.getAvailableSpaces({
      hora_entrada, hora_salida, tipo, capacidad
    });

    res.json(spaces);
  } catch (err) {
    res.status(500).json({ error: 'Error al buscar disponibilidad', detail: err.message });
  }
};

module.exports = { getMine, getToday, getByDate, create, cancel, getAvailable };

// Made with Bob

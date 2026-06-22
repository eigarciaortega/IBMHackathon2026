const spacesService = require('../services/spaces.service');

const getAllSpaces = async (req, res) => {
  try {
    const { type, min_capacity } = req.query;
    const spaces = await spacesService.getAllSpaces({ type, min_capacity });
    return res.status(200).json(spaces);
  } catch (err) {
    console.error('[Spaces] GetAll error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getSpaceById = async (req, res) => {
  try {
    const space = await spacesService.getSpaceById(parseInt(req.params.id));
    if (!space) return res.status(404).json({ error: 'Space not found' });
    return res.status(200).json(space);
  } catch (err) {
    console.error('[Spaces] GetById error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getAvailableSpaces = async (req, res) => {
  const { start_time, end_time, type, min_capacity } = req.query;

  if (!start_time || !end_time) {
    return res.status(400).json({ error: 'start_time and end_time are required' });
  }

  const start = new Date(start_time);
  const end   = new Date(end_time);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  if (end <= start) {
    return res.status(400).json({ error: 'end_time must be after start_time' });
  }

  try {
    const spaces = await spacesService.getAvailableSpaces({
      start_time,
      end_time,
      type,
      min_capacity,
    });
    return res.status(200).json(spaces);
  } catch (err) {
    console.error('[Spaces] Availability error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const createSpace = async (req, res) => {
  const { name, type, capacity, floor, has_projector, has_ac } = req.body;

  if (!name || !type || !capacity) {
    return res.status(400).json({ error: 'name, type, and capacity are required' });
  }

  if (!['SALA', 'DESK'].includes(type.toUpperCase())) {
    return res.status(400).json({ error: 'type must be SALA or DESK' });
  }

  if (!Number.isInteger(Number(capacity)) || Number(capacity) < 1) {
    return res.status(400).json({ error: 'capacity must be a positive integer' });
  }

  try {
    const space = await spacesService.createSpace({ name, type, capacity, floor, has_projector, has_ac });
    return res.status(201).json(space);
  } catch (err) {
    console.error('[Spaces] Create error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const updateSpace = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid space id' });
  }

  try {
    const space = await spacesService.updateSpace(id, req.body);
    if (!space) return res.status(404).json({ error: 'Space not found' });
    return res.status(200).json(space);
  } catch (err) {
    console.error('[Spaces] Update error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteSpace = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid space id' });
  }

  try {
    const result = await spacesService.deleteSpace(id);
    if (!result) return res.status(404).json({ error: 'Space not found' });
    return res.status(200).json({ message: 'Space deleted successfully' });
  } catch (err) {
    console.error('[Spaces] Delete error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getAllSpaces, getSpaceById, getAvailableSpaces, createSpace, updateSpace, deleteSpace };

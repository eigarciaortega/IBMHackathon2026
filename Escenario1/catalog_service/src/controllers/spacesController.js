const spacesService = require('../services/spacesService');

const getAll = async (req, res) => {
  try {
    const { tipo, capacidad } = req.query;
    const spaces = await spacesService.getAll({ tipo, capacidad });
    res.json(spaces);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener espacios', detail: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const space = await spacesService.getById(req.params.id);
    if (!space) return res.status(404).json({ error: 'Espacio no encontrado' });
    res.json(space);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener espacio', detail: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { nombre, tipo, capacidad, piso, con_proyector, con_aire, con_pizarron, con_tv } = req.body;

    if (!nombre || !tipo || !capacidad) {
      return res.status(400).json({ error: 'nombre, tipo y capacidad son obligatorios' });
    }
    if (!['SALA', 'DESK'].includes(tipo.toUpperCase())) {
      return res.status(400).json({ error: 'tipo debe ser SALA o DESK' });
    }

    const space = await spacesService.create({
      nombre, tipo, capacidad, piso,
      con_proyector, con_aire, con_pizarron, con_tv
    });
    res.status(201).json(space);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear espacio', detail: err.message });
  }
};

const update = async (req, res) => {
  try {
    const space = await spacesService.update(req.params.id, req.body);
    if (!space) return res.status(404).json({ error: 'Espacio no encontrado' });
    res.json(space);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar espacio', detail: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const space = await spacesService.remove(req.params.id);
    if (!space) return res.status(404).json({ error: 'Espacio no encontrado' });
    res.json({ message: 'Espacio eliminado correctamente', space });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar espacio', detail: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
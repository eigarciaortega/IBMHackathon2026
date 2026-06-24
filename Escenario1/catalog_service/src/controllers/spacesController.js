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
    console.log('=== DEBUG CREATE SPACE ===');
    console.log('Body recibido:', req.body);
    console.log('Usuario:', req.user);
    
    const { nombre, tipo, capacidad, piso, con_proyector, con_aire, con_pizarron, con_tv, con_refrigerador } = req.body;

    if (!nombre || !tipo || !capacidad) {
      console.log('❌ Faltan campos obligatorios');
      return res.status(400).json({ error: 'nombre, tipo y capacidad son obligatorios' });
    }
    if (!['SALA', 'DESK'].includes(tipo.toUpperCase())) {
      console.log('❌ Tipo inválido:', tipo);
      return res.status(400).json({ error: 'tipo debe ser SALA o DESK' });
    }

    console.log('✅ Validaciones pasadas, creando espacio...');
    const space = await spacesService.create({
      nombre, tipo, capacidad, piso,
      con_proyector, con_aire, con_pizarron, con_tv, con_refrigerador
    });
    console.log('✅ Espacio creado:', space);
    console.log('========================');
    res.status(201).json(space);
  } catch (err) {
    console.log('❌ Error al crear espacio:', err);
    console.log('========================');
    res.status(500).json({ error: 'Error al crear espacio', detail: err.message, stack: err.stack });
  }
};

const update = async (req, res) => {
  try {
    console.log('=== DEBUG UPDATE SPACE ===');
    console.log('ID:', req.params.id);
    console.log('Body:', req.body);
    console.log('Usuario:', req.user);
    
    const space = await spacesService.update(req.params.id, req.body);
    if (!space) {
      console.log('❌ Espacio no encontrado');
      console.log('========================');
      return res.status(404).json({ error: 'Espacio no encontrado' });
    }
    console.log('✅ Espacio actualizado:', space);
    console.log('========================');
    res.json(space);
  } catch (err) {
    console.log('❌ Error al actualizar:', err);
    console.log('========================');
    res.status(500).json({ error: 'Error al actualizar espacio', detail: err.message, stack: err.stack });
  }
};

const remove = async (req, res) => {
  try {
    console.log('=== DEBUG DELETE SPACE ===');
    console.log('ID:', req.params.id);
    console.log('Usuario:', req.user);
    
    const space = await spacesService.remove(req.params.id);
    if (!space) {
      console.log('❌ Espacio no encontrado');
      console.log('========================');
      return res.status(404).json({ error: 'Espacio no encontrado' });
    }
    console.log('✅ Espacio eliminado:', space);
    console.log('========================');
    res.json({ message: 'Espacio eliminado correctamente', space });
  } catch (err) {
    console.log('❌ Error al eliminar:', err);
    console.log('========================');
    res.status(500).json({ error: 'Error al eliminar espacio', detail: err.message, stack: err.stack });
  }
};

module.exports = { getAll, getById, create, update, remove };

// Made with Bob

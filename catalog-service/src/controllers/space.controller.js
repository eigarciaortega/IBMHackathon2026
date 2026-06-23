const Space = require('../models/Space');

// Obtener todos los espacios
exports.getAllSpaces = async (req, res) => {
    try {
        const { tipo, piso, capacidadMin, disponible } = req.query;

        // Construir filtros
        const filters = {};

        if (tipo) filters.tipo = tipo;
        if (piso) filters.piso = parseInt(piso);
        if (capacidadMin) filters.capacidad = { $gte: parseInt(capacidadMin) };
        if (disponible === 'true') filters.estado = 'Disponible';

        const spaces = await Space.find(filters).sort({ piso: 1, nombre: 1 });

        res.status(200).json({
            success: true,
            count: spaces.length,
            data: spaces
        });

    } catch (error) {
        console.error('Error al obtener espacios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener espacios',
            error: error.message
        });
    }
};

// Obtener un espacio por ID
exports.getSpaceById = async (req, res) => {
    try {
        const space = await Space.findById(req.params.id);

        if (!space) {
            return res.status(404).json({
                success: false,
                message: 'Espacio no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            data: space
        });

    } catch (error) {
        console.error('Error al obtener espacio:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener espacio',
            error: error.message
        });
    }
};

// Crear nuevo espacio (solo ADMIN)
exports.createSpace = async (req, res) => {
    try {
        const { nombre, tipo, capacidad, recursos, piso, ubicacion } = req.body;

        // Validaciones
        if (!nombre || !tipo || !capacidad || !piso || !ubicacion) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos obligatorios deben ser proporcionados'
            });
        }

        // Verificar si ya existe un espacio con el mismo nombre
        const existingSpace = await Space.findOne({ nombre });
        if (existingSpace) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un espacio con ese nombre'
            });
        }

        const space = new Space({
            nombre,
            tipo,
            capacidad,
            recursos: recursos || {},
            piso,
            ubicacion
        });

        await space.save();

        res.status(201).json({
            success: true,
            message: 'Espacio creado exitosamente',
            data: space
        });

    } catch (error) {
        console.error('Error al crear espacio:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear espacio',
            error: error.message
        });
    }
};

// Actualizar espacio (solo ADMIN)
exports.updateSpace = async (req, res) => {
    try {
        const { nombre, tipo, capacidad, recursos, piso, ubicacion, estado } = req.body;

        const space = await Space.findById(req.params.id);

        if (!space) {
            return res.status(404).json({
                success: false,
                message: 'Espacio no encontrado'
            });
        }

        // Actualizar campos
        if (nombre) space.nombre = nombre;
        if (tipo) space.tipo = tipo;
        if (capacidad) space.capacidad = capacidad;
        if (recursos) space.recursos = { ...space.recursos, ...recursos };
        if (piso) space.piso = piso;
        if (ubicacion) space.ubicacion = ubicacion;
        if (estado) space.estado = estado;

        await space.save();

        res.status(200).json({
            success: true,
            message: 'Espacio actualizado exitosamente',
            data: space
        });

    } catch (error) {
        console.error('Error al actualizar espacio:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar espacio',
            error: error.message
        });
    }
};

// Eliminar espacio (solo ADMIN)
exports.deleteSpace = async (req, res) => {
    try {
        const space = await Space.findById(req.params.id);

        if (!space) {
            return res.status(404).json({
                success: false,
                message: 'Espacio no encontrado'
            });
        }

        await Space.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Espacio eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar espacio:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar espacio',
            error: error.message
        });
    }
};

// Dashboard de ocupación
exports.getDashboard = async (req, res) => {
    try {
        // Obtener todos los espacios
        const allSpaces = await Space.find();

        // Estadísticas por estado
        const stats = {
            total: allSpaces.length,
            disponibles: allSpaces.filter(s => s.estado === 'Disponible').length,
            ocupados: allSpaces.filter(s => s.estado === 'Ocupado').length,
            mantenimiento: allSpaces.filter(s => s.estado === 'Mantenimiento').length
        };

        // Estadísticas por tipo
        const porTipo = {
            salas: allSpaces.filter(s => s.tipo === 'Sala de juntas').length,
            escritorios: allSpaces.filter(s => s.tipo === 'Escritorio individual').length
        };

        // Estadísticas por piso
        const porPiso = {};
        allSpaces.forEach(space => {
            if (!porPiso[space.piso]) {
                porPiso[space.piso] = {
                    total: 0,
                    disponibles: 0,
                    ocupados: 0
                };
            }
            porPiso[space.piso].total++;
            if (space.estado === 'Disponible') porPiso[space.piso].disponibles++;
            if (space.estado === 'Ocupado') porPiso[space.piso].ocupados++;
        });

        // Espacios ordenados por estado
        const espaciosPorEstado = {
            disponibles: allSpaces.filter(s => s.estado === 'Disponible'),
            ocupados: allSpaces.filter(s => s.estado === 'Ocupado'),
            mantenimiento: allSpaces.filter(s => s.estado === 'Mantenimiento')
        };

        res.status(200).json({
            success: true,
            data: {
                estadisticas: stats,
                porTipo,
                porPiso,
                espaciosPorEstado
            }
        });

    } catch (error) {
        console.error('Error al obtener dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener dashboard',
            error: error.message
        });
    }
};

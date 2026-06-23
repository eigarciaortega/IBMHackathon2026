const Booking = require('../models/Booking');
const axios = require('axios');

// Validar disponibilidad del espacio
const checkAvailability = async (espacioId, fechaInicio, fechaFin, excludeBookingId = null) => {
    const query = {
        espacioId,
        estado: 'Activa',
        $or: [
            // La nueva reserva comienza durante una reserva existente
            {
                fechaInicio: { $lte: fechaInicio },
                fechaFin: { $gt: fechaInicio }
            },
            // La nueva reserva termina durante una reserva existente
            {
                fechaInicio: { $lt: fechaFin },
                fechaFin: { $gte: fechaFin }
            },
            // La nueva reserva envuelve completamente una reserva existente
            {
                fechaInicio: { $gte: fechaInicio },
                fechaFin: { $lte: fechaFin }
            }
        ]
    };

    // Excluir la reserva actual si estamos actualizando
    if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
    }

    const overlappingBookings = await Booking.find(query);
    return overlappingBookings.length === 0;
};

// Obtener información del espacio desde catalog-service
const getSpaceInfo = async (espacioId, token) => {
    try {
        const catalogUrl = process.env.CATALOG_SERVICE_URL || 'http://localhost:3002';
        console.log(`Intentando obtener espacio desde: ${catalogUrl}/api/spaces/${espacioId}`);

        const response = await axios.get(
            `${catalogUrl}/api/spaces/${espacioId}`,
            {
                headers: { 'Authorization': token }
            }
        );
        return response.data.data;
    } catch (error) {
        console.error('Error al obtener espacio:', error.message);
        console.error('URL intentada:', `${process.env.CATALOG_SERVICE_URL}/api/spaces/${espacioId}`);
        throw new Error(`No se pudo obtener información del espacio: ${error.message}`);
    }
};

// Buscar espacios disponibles
exports.searchAvailableSpaces = async (req, res) => {
    try {
        const { fechaInicio, fechaFin, capacidadMin, tipo, piso } = req.query;

        // Validaciones
        if (!fechaInicio || !fechaFin) {
            return res.status(400).json({
                success: false,
                message: 'Debe proporcionar fechaInicio y fechaFin'
            });
        }

        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        const ahora = new Date();

        // Validar que la fecha no sea en el pasado
        if (inicio < ahora) {
            return res.status(400).json({
                success: false,
                message: 'No se pueden hacer reservas en el pasado'
            });
        }

        // Validar que fechaFin sea posterior a fechaInicio
        if (fin <= inicio) {
            return res.status(400).json({
                success: false,
                message: 'La fecha de fin debe ser posterior a la fecha de inicio'
            });
        }

        // Obtener token del usuario
        const token = req.header('Authorization');

        // Obtener todos los espacios del catalog-service
        let catalogUrl = `${process.env.CATALOG_SERVICE_URL}/api/spaces?`;
        if (tipo) catalogUrl += `tipo=${tipo}&`;
        if (piso) catalogUrl += `piso=${piso}&`;
        if (capacidadMin) catalogUrl += `capacidadMin=${capacidadMin}`;

        const spacesResponse = await axios.get(catalogUrl, {
            headers: { 'Authorization': token }
        });

        const allSpaces = spacesResponse.data.data;

        // Filtrar espacios disponibles (sin estado Mantenimiento)
        const spacesDisponibles = allSpaces.filter(s => s.estado !== 'Mantenimiento');

        // Verificar disponibilidad de cada espacio
        const availabilityPromises = spacesDisponibles.map(async (space) => {
            const isAvailable = await checkAvailability(space._id, inicio, fin);
            return {
                ...space,
                disponible: isAvailable
            };
        });

        const spacesWithAvailability = await Promise.all(availabilityPromises);

        // Filtrar solo los disponibles
        const spacesAvailable = spacesWithAvailability.filter(s => s.disponible);

        res.status(200).json({
            success: true,
            count: spacesAvailable.length,
            filtros: { fechaInicio, fechaFin, capacidadMin, tipo, piso },
            data: spacesAvailable
        });

    } catch (error) {
        console.error('Error al buscar disponibilidad:', error);
        res.status(500).json({
            success: false,
            message: 'Error al buscar disponibilidad',
            error: error.message
        });
    }
};

// Crear nueva reserva
exports.createBooking = async (req, res) => {
    try {
        const { espacioId, espacioNombre, fechaInicio, fechaFin, cantidadPersonas, motivo, capacidadEspacio } = req.body;
        const userId = req.user.id;
        const userEmail = req.user.email;

        // Validaciones básicas
        if (!espacioId || !espacioNombre || !fechaInicio || !fechaFin || !cantidadPersonas) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos obligatorios deben ser proporcionados'
            });
        }

        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        const ahora = new Date();

        // Validar que la fecha no sea en el pasado
        if (inicio < ahora) {
            return res.status(400).json({
                success: false,
                message: 'No se pueden hacer reservas en el pasado'
            });
        }

        // Validar que fechaFin sea posterior a fechaInicio
        if (fin <= inicio) {
            return res.status(400).json({
                success: false,
                message: 'La fecha de fin debe ser posterior a la fecha de inicio'
            });
        }

        // Validar capacidad si se proporciona
        if (capacidadEspacio && cantidadPersonas > capacidadEspacio) {
            return res.status(400).json({
                success: false,
                message: `La cantidad de personas (${cantidadPersonas}) excede la capacidad del espacio (${capacidadEspacio})`
            });
        }

        // Verificar disponibilidad (sin overlapping)
        const isAvailable = await checkAvailability(espacioId, inicio, fin);

        if (!isAvailable) {
            return res.status(409).json({
                success: false,
                message: 'El espacio ya está reservado en ese horario'
            });
        }

        // Crear la reserva
        const booking = new Booking({
            usuarioId: userId,
            usuarioEmail: userEmail,
            espacioId,
            espacioNombre,
            fechaInicio: inicio,
            fechaFin: fin,
            cantidadPersonas,
            motivo: motivo || ''
        });

        await booking.save();

        res.status(201).json({
            success: true,
            message: 'Reserva creada exitosamente',
            data: booking
        });

    } catch (error) {
        console.error('Error al crear reserva:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear reserva',
            error: error.message
        });
    }
};

// Obtener las reservas del usuario autenticado
exports.getMyBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { estado, futuras } = req.query;

        const query = { usuarioId: userId };

        // Filtrar por estado si se proporciona
        if (estado) {
            query.estado = estado;
        }

        // Filtrar solo reservas futuras
        if (futuras === 'true') {
            query.fechaInicio = { $gte: new Date() };
            query.estado = 'Activa';
        }

        const bookings = await Booking.find(query).sort({ fechaInicio: -1 });

        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
        });

    } catch (error) {
        console.error('Error al obtener reservas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener reservas',
            error: error.message
        });
    }
};

// Obtener todas las reservas (para admin)
exports.getAllBookings = async (req, res) => {
    try {
        const { espacioId, estado, desde, hasta } = req.query;

        const query = {};

        if (espacioId) query.espacioId = espacioId;
        if (estado) query.estado = estado;

        if (desde || hasta) {
            query.fechaInicio = {};
            if (desde) query.fechaInicio.$gte = new Date(desde);
            if (hasta) query.fechaInicio.$lte = new Date(hasta);
        }

        const bookings = await Booking.find(query).sort({ fechaInicio: -1 });

        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
        });

    } catch (error) {
        console.error('Error al obtener reservas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener reservas',
            error: error.message
        });
    }
};

// Obtener una reserva específica
exports.getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Reserva no encontrada'
            });
        }

        // Verificar que el usuario sea dueño de la reserva o sea admin
        if (booking.usuarioId !== req.user.id && req.user.role !== 'ADMINISTRADOR') {
            return res.status(403).json({
                success: false,
                message: 'No tiene permisos para ver esta reserva'
            });
        }

        res.status(200).json({
            success: true,
            data: booking
        });

    } catch (error) {
        console.error('Error al obtener reserva:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener reserva',
            error: error.message
        });
    }
};

// Cancelar reserva
exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Reserva no encontrada'
            });
        }

        // Verificar que el usuario sea dueño de la reserva o sea admin
        if (booking.usuarioId !== req.user.id && req.user.role !== 'ADMINISTRADOR') {
            return res.status(403).json({
                success: false,
                message: 'No tiene permisos para cancelar esta reserva'
            });
        }

        // Verificar que la reserva esté activa
        if (booking.estado !== 'Activa') {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden cancelar reservas activas'
            });
        }

        // Verificar que sea una reserva futura
        if (booking.fechaInicio < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'No se pueden cancelar reservas que ya comenzaron'
            });
        }

        // Cancelar la reserva
        booking.estado = 'Cancelada';
        booking.canceladaAt = new Date();
        booking.motivoCancelacion = req.body.motivo || 'Sin motivo especificado';

        await booking.save();

        res.status(200).json({
            success: true,
            message: 'Reserva cancelada exitosamente',
            data: booking
        });

    } catch (error) {
        console.error('Error al cancelar reserva:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cancelar reserva',
            error: error.message
        });
    }
};

// Obtener estadísticas de reservas
exports.getBookingStats = async (req, res) => {
    try {
        const ahora = new Date();

        const stats = {
            totalReservas: await Booking.countDocuments(),
            reservasActivas: await Booking.countDocuments({ estado: 'Activa' }),
            reservasCanceladas: await Booking.countDocuments({ estado: 'Cancelada' }),
            reservasFuturas: await Booking.countDocuments({
                estado: 'Activa',
                fechaInicio: { $gte: ahora }
            }),
            reservasHoy: await Booking.countDocuments({
                estado: 'Activa',
                fechaInicio: {
                    $gte: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()),
                    $lt: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1)
                }
            })
        };

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};

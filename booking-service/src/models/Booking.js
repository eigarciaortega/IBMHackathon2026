const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    usuarioId: {
        type: String,
        required: true,
        index: true
    },

    usuarioEmail: {
        type: String,
        required: true
    },

    espacioId: {
        type: String,
        required: true,
        index: true
    },

    espacioNombre: {
        type: String,
        required: true
    },

    fechaInicio: {
        type: Date,
        required: true,
        index: true
    },

    fechaFin: {
        type: Date,
        required: true,
        index: true
    },

    cantidadPersonas: {
        type: Number,
        required: true,
        min: 1
    },

    motivo: {
        type: String,
        trim: true,
        maxlength: 500
    },

    estado: {
        type: String,
        enum: ['Activa', 'Cancelada', 'Completada'],
        default: 'Activa'
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    canceladaAt: {
        type: Date
    },

    motivoCancelacion: {
        type: String,
        trim: true
    }
});

// Índice compuesto para búsquedas de disponibilidad
BookingSchema.index({ espacioId: 1, fechaInicio: 1, fechaFin: 1 });
BookingSchema.index({ usuarioId: 1, estado: 1 });

module.exports = mongoose.model('Booking', BookingSchema);

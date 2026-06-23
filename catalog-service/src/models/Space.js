const mongoose = require('mongoose');

const SpaceSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },

    tipo: {
        type: String,
        enum: ['Sala de juntas', 'Escritorio individual'],
        required: true
    },

    capacidad: {
        type: Number,
        required: true,
        min: 1
    },

    recursos: {
        proyector: {
            type: Boolean,
            default: false
        },
        aireAcondicionado: {
            type: Boolean,
            default: false
        },
        pantalla: {
            type: Boolean,
            default: false
        },
        wifi: {
            type: Boolean,
            default: true
        }
    },

    piso: {
        type: Number,
        required: true,
        min: 1
    },

    ubicacion: {
        type: String,
        required: true,
        trim: true
    },

    estado: {
        type: String,
        enum: ['Disponible', 'Ocupado', 'Mantenimiento'],
        default: 'Disponible'
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Actualizar updatedAt antes de guardar
SpaceSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Space', SpaceSchema);

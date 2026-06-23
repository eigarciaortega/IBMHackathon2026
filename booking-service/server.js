require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bookingRoutes = require('./src/routes/booking.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✓ MongoDB conectado (Booking Service)');
    })
    .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Rutas
app.get('/', (req, res) => {
    res.json({
        message: 'Booking Service funcionando',
        endpoints: {
            searchAvailability: 'GET /api/bookings/search?fechaInicio=...&fechaFin=...',
            createBooking: 'POST /api/bookings',
            myBookings: 'GET /api/bookings/my-bookings',
            cancelBooking: 'PATCH /api/bookings/:id/cancel',
            getBooking: 'GET /api/bookings/:id',
            stats: 'GET /api/bookings/stats/summary'
        }
    });
});

app.use('/api/bookings', bookingRoutes);

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
    console.log(`🚀 Booking Service ejecutándose en puerto ${PORT}`);
});

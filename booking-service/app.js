require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes    = require('./src/routes/auth.routes');
const bookingRoutes = require('./src/routes/bookings.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth',     authRoutes);
app.use('/bookings', bookingRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'booking-service' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[booking-service] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`[booking-service] Running on port ${PORT}`);
});

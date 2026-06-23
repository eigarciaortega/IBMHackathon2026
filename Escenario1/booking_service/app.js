require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost'],
  credentials: true
}));
app.use(express.json());

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'booking-service', port: PORT });
});

// Rutas
app.use('/bookings', require('./src/routes/bookings'));

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: `Ruta ${req.method} ${req.url} no encontrada` });
});

app.listen(PORT, () => {
  console.log(`🚀 booking-service corriendo en puerto ${PORT}`);
  console.log(`📚 Swagger disponible en http://localhost:${PORT}/api-docs`);
});
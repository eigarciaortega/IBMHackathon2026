require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost'],
  credentials: true
}));
app.use(express.json());

// Swagger — DEBE ir aquí, antes de las rutas y del 404
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'catalog-service', port: PORT });
});

// Rutas
app.use('/auth', require('./src/routes/auth'));
app.use('/spaces', require('./src/routes/spaces'));

// 404 — DEBE ir al final
app.use((req, res) => {
  res.status(404).json({ error: `Ruta ${req.method} ${req.url} no encontrada` });
});

app.listen(PORT, () => {
  console.log(`🚀 catalog-service corriendo en puerto ${PORT}`);
  console.log(`📚 Swagger disponible en http://localhost:${PORT}/api-docs`);
});
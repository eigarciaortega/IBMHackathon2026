require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const seedSpaces = require('./src/utils/seedSpaces');
const spaceRoutes = require('./src/routes/space.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✓ MongoDB conectado (Catalog Service)');
        // Inicializar espacios de ejemplo
        await seedSpaces();
    })
    .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Rutas
app.get('/', (req, res) => {
    res.json({
        message: 'Catalog Service funcionando',
        endpoints: {
            getAllSpaces: 'GET /api/spaces',
            getSpace: 'GET /api/spaces/:id',
            createSpace: 'POST /api/spaces (Admin)',
            updateSpace: 'PUT /api/spaces/:id (Admin)',
            deleteSpace: 'DELETE /api/spaces/:id (Admin)',
            dashboard: 'GET /api/spaces/dashboard'
        }
    });
});

app.use('/api/spaces', spaceRoutes);

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`🚀 Catalog Service ejecutándose en puerto ${PORT}`);
});

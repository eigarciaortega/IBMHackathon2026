require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const seedUsers = require('./src/utils/seedUsers');
const authRoutes = require('./src/routes/auth.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✓ MongoDB conectado');
        // Inicializar usuarios predefinidos
        await seedUsers();
    })
    .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Rutas
app.get('/', (req, res) => {
    res.json({
        message: 'Auth Service funcionando',
        endpoints: {
            register: 'POST /api/auth/register',
            login: 'POST /api/auth/login',
            profile: 'GET /api/auth/profile',
            verify: 'GET /api/auth/verify'
        }
    });
});

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${PORT}`);
});
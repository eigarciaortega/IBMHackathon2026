const bcrypt = require('bcryptjs');
const User = require('../models/User');

const seedUsers = async () => {
    try {
        // Verificar si ya existen usuarios
        const userCount = await User.countDocuments();

        if (userCount > 0) {
            console.log('✓ Usuarios ya existen en la base de datos');
            return;
        }

        console.log('📝 Inicializando usuarios predefinidos...');

        // Hash de contraseñas
        const adminPasswordHash = await bcrypt.hash('Admin123', 10);
        const userPasswordHash = await bcrypt.hash('User123', 10);

        // Usuarios predefinidos según requerimientos
        const predefinedUsers = [
            {
                email: 'admin@corporativoalpha.com',
                password: adminPasswordHash,
                role: 'ADMINISTRADOR'
            },
            {
                email: 'carlos.mendez@corporativoalpha.com',
                password: userPasswordHash,
                role: 'COLABORADOR'
            },
            {
                email: 'ana.torres@corporativoalpha.com',
                password: userPasswordHash,
                role: 'COLABORADOR'
            }
        ];

        // Insertar usuarios
        await User.insertMany(predefinedUsers);

        console.log('✓ Usuarios predefinidos creados exitosamente:');
        console.log('  - admin@corporativoalpha.com (ADMINISTRADOR)');
        console.log('  - carlos.mendez@corporativoalpha.com (COLABORADOR)');
        console.log('  - ana.torres@corporativoalpha.com (COLABORADOR)');

    } catch (error) {
        console.error('❌ Error al inicializar usuarios:', error.message);
    }
};

module.exports = seedUsers;

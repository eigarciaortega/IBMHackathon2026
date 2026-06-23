const Space = require('../models/Space');

const seedSpaces = async () => {
    try {
        // Verificar si ya existen espacios
        const spaceCount = await Space.countDocuments();

        if (spaceCount > 0) {
            console.log('✓ Espacios ya existen en la base de datos');
            return;
        }

        console.log('📝 Inicializando espacios de ejemplo...');

        const exampleSpaces = [
            // Piso 1
            {
                nombre: 'Sala Ejecutiva A',
                tipo: 'Sala de juntas',
                capacidad: 10,
                recursos: {
                    proyector: true,
                    aireAcondicionado: true,
                    pantalla: true,
                    wifi: true
                },
                piso: 1,
                ubicacion: 'Ala Norte',
                estado: 'Disponible'
            },
            {
                nombre: 'Sala de Reuniones B',
                tipo: 'Sala de juntas',
                capacidad: 6,
                recursos: {
                    proyector: true,
                    aireAcondicionado: true,
                    pantalla: false,
                    wifi: true
                },
                piso: 1,
                ubicacion: 'Ala Sur',
                estado: 'Disponible'
            },
            {
                nombre: 'Escritorio 101',
                tipo: 'Escritorio individual',
                capacidad: 1,
                recursos: {
                    proyector: false,
                    aireAcondicionado: true,
                    pantalla: false,
                    wifi: true
                },
                piso: 1,
                ubicacion: 'Área Abierta Este',
                estado: 'Disponible'
            },
            {
                nombre: 'Escritorio 102',
                tipo: 'Escritorio individual',
                capacidad: 1,
                recursos: {
                    proyector: false,
                    aireAcondicionado: true,
                    pantalla: false,
                    wifi: true
                },
                piso: 1,
                ubicacion: 'Área Abierta Este',
                estado: 'Ocupado'
            },

            // Piso 2
            {
                nombre: 'Sala de Conferencias Principal',
                tipo: 'Sala de juntas',
                capacidad: 20,
                recursos: {
                    proyector: true,
                    aireAcondicionado: true,
                    pantalla: true,
                    wifi: true
                },
                piso: 2,
                ubicacion: 'Centro',
                estado: 'Disponible'
            },
            {
                nombre: 'Sala Creativa',
                tipo: 'Sala de juntas',
                capacidad: 8,
                recursos: {
                    proyector: true,
                    aireAcondicionado: true,
                    pantalla: true,
                    wifi: true
                },
                piso: 2,
                ubicacion: 'Ala Oeste',
                estado: 'Ocupado'
            },
            {
                nombre: 'Escritorio 201',
                tipo: 'Escritorio individual',
                capacidad: 1,
                recursos: {
                    proyector: false,
                    aireAcondicionado: true,
                    pantalla: false,
                    wifi: true
                },
                piso: 2,
                ubicacion: 'Área Abierta Norte',
                estado: 'Disponible'
            },
            {
                nombre: 'Escritorio 202',
                tipo: 'Escritorio individual',
                capacidad: 1,
                recursos: {
                    proyector: false,
                    aireAcondicionado: true,
                    pantalla: false,
                    wifi: true
                },
                piso: 2,
                ubicacion: 'Área Abierta Norte',
                estado: 'Disponible'
            },

            // Piso 3
            {
                nombre: 'Sala de Juntas Premium',
                tipo: 'Sala de juntas',
                capacidad: 12,
                recursos: {
                    proyector: true,
                    aireAcondicionado: true,
                    pantalla: true,
                    wifi: true
                },
                piso: 3,
                ubicacion: 'Ala Este',
                estado: 'Disponible'
            },
            {
                nombre: 'Escritorio 301',
                tipo: 'Escritorio individual',
                capacidad: 1,
                recursos: {
                    proyector: false,
                    aireAcondicionado: true,
                    pantalla: false,
                    wifi: true
                },
                piso: 3,
                ubicacion: 'Área Abierta Central',
                estado: 'Mantenimiento'
            }
        ];

        await Space.insertMany(exampleSpaces);

        console.log(`✓ ${exampleSpaces.length} espacios de ejemplo creados exitosamente`);

    } catch (error) {
        console.error('❌ Error al inicializar espacios:', error.message);
    }
};

module.exports = seedSpaces;

/**
 * OfficeSpace — Prisma seed (Fase 4)
 *
 * Crea datos base para validación funcional:
 *   - Roles: ADMIN, COLLABORATOR
 *   - Usuarios de prueba (contraseñas hasheadas con bcrypt)
 *   - Recursos (catálogo)
 *   - Espacios iniciales
 *   - Asociaciones espacio-recurso
 *   - FAQ inicial
 *
 * Notas:
 *   - Idempotente: usa upsert por campos únicos donde es posible y guarda
 *     contra duplicados en tablas sin clave natural única.
 *   - Los usuarios semilla se crean ya activados (temporaryPassword=false,
 *     mustChangePassword=false) para que las credenciales documentadas
 *     funcionen directamente en pruebas. En producción, el alta real sigue
 *     el flujo H-01 (password temporal + cambio obligatorio).
 *   - No se siembran reservas para evitar dependencias de fecha/hora; el
 *     BookingService (Fase 5) y sus tests cubrirán ese flujo.
 */
import { PrismaClient, UserStatus, SpaceStatus, ResourceStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function main(): Promise<void> {
  // ---- Roles ----
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Administrador del sistema' },
  });

  const collaboratorRole = await prisma.role.upsert({
    where: { name: 'COLLABORATOR' },
    update: {},
    create: { name: 'COLLABORATOR', description: 'Colaborador (usuario estándar)' },
  });

  // ---- Usuarios de prueba ----
  const adminPassword = await bcrypt.hash('Admin123', BCRYPT_ROUNDS);
  const userPassword = await bcrypt.hash('User123', BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@corporativoalpha.com' },
    update: {},
    create: {
      firstName: 'Admin',
      lastName: 'Alpha',
      email: 'admin@corporativoalpha.com',
      passwordHash: adminPassword,
      roleId: adminRole.id,
      status: UserStatus.ACTIVE,
      temporaryPassword: false,
      mustChangePassword: false,
    },
  });

  await prisma.user.upsert({
    where: { email: 'carlos.mendez@corporativoalpha.com' },
    update: {},
    create: {
      firstName: 'Carlos',
      lastName: 'Méndez',
      email: 'carlos.mendez@corporativoalpha.com',
      passwordHash: userPassword,
      roleId: collaboratorRole.id,
      status: UserStatus.ACTIVE,
      temporaryPassword: false,
      mustChangePassword: false,
    },
  });

  await prisma.user.upsert({
    where: { email: 'ana.torres@corporativoalpha.com' },
    update: {},
    create: {
      firstName: 'Ana',
      lastName: 'Torres',
      email: 'ana.torres@corporativoalpha.com',
      passwordHash: userPassword,
      roleId: collaboratorRole.id,
      status: UserStatus.ACTIVE,
      temporaryPassword: false,
      mustChangePassword: false,
    },
  });

  // ---- Recursos ----
  const resourceNames = [
    'Projector',
    'TV',
    'Screen',
    'Whiteboard',
    'Internet',
    'Audio System',
    'Video Conference',
    'Air Conditioning',
    'Power Outlets',
  ];

  const resources: Record<string, string> = {};
  for (const name of resourceNames) {
    const r = await prisma.resource.upsert({
      where: { name },
      update: {},
      create: { name, status: ResourceStatus.ACTIVE },
    });
    resources[name] = r.id;
  }

  // ---- Espacios ----
  // Se evita duplicar: solo se siembran si la tabla está vacía.
  const existingSpaces = await prisma.space.count();
  if (existingSpaces === 0) {
    type SeedSpace = {
      name: string;
      spaceType: string;
      capacity: number;
      floor: string;
      zone: string;
      resources: string[];
    };

    const spaces: SeedSpace[] = [
      { name: 'Sala Creativa', spaceType: 'Meeting Room Medium', capacity: 8, floor: 'Piso 1', zone: 'Norte', resources: ['Projector', 'Whiteboard', 'Internet', 'Air Conditioning'] },
      { name: 'Sala Ejecutiva', spaceType: 'Executive Room', capacity: 12, floor: 'Piso 2', zone: 'Sur', resources: ['TV', 'Video Conference', 'Internet', 'Air Conditioning'] },
      { name: 'Sala Capacitación', spaceType: 'Training Room', capacity: 20, floor: 'Piso 2', zone: 'Centro', resources: ['Projector', 'Screen', 'Audio System', 'Internet'] },
      { name: 'Sala Entrevistas', spaceType: 'Interview Room', capacity: 4, floor: 'Piso 1', zone: 'Sur', resources: ['Internet', 'Air Conditioning'] },
      { name: 'Escritorio A-01', spaceType: 'Desk', capacity: 1, floor: 'Piso 1', zone: 'Norte', resources: ['Internet', 'Power Outlets'] },
      { name: 'Escritorio A-02', spaceType: 'Desk', capacity: 1, floor: 'Piso 1', zone: 'Norte', resources: ['Internet', 'Power Outlets'] },
      { name: 'Escritorio B-01', spaceType: 'Desk', capacity: 1, floor: 'Piso 1', zone: 'Sur', resources: ['Internet', 'Power Outlets'] },
      { name: 'Cubículo Privado B-02', spaceType: 'Private Cubicle', capacity: 2, floor: 'Piso 1', zone: 'Sur', resources: ['Internet', 'Power Outlets'] },
      { name: 'Cabina Video 01', spaceType: 'Video Booth', capacity: 1, floor: 'Piso 3', zone: 'Centro', resources: ['Video Conference', 'Internet'] },
      { name: 'Cabina Video 02', spaceType: 'Video Booth', capacity: 1, floor: 'Piso 3', zone: 'Centro', resources: ['Video Conference', 'Internet'] },
      { name: 'Cowork Norte', spaceType: 'Cowork Area', capacity: 15, floor: 'Piso 1', zone: 'Norte', resources: ['Internet', 'Power Outlets', 'Air Conditioning'] },
      { name: 'Cowork Sur', spaceType: 'Cowork Area', capacity: 15, floor: 'Piso 1', zone: 'Sur', resources: ['Internet', 'Power Outlets', 'Air Conditioning'] },
    ];

    for (const s of spaces) {
      const created = await prisma.space.create({
        data: {
          name: s.name,
          spaceType: s.spaceType,
          capacity: s.capacity,
          floor: s.floor,
          zone: s.zone,
          status: SpaceStatus.AVAILABLE,
          createdBy: admin.id,
        },
      });

      await prisma.spaceResource.createMany({
        data: s.resources.map((rn) => ({ spaceId: created.id, resourceId: resources[rn] })),
        skipDuplicates: true,
      });
    }
  }

  // ---- FAQ ----
  const existingFaq = await prisma.chatbotFaq.count();
  if (existingFaq === 0) {
    await prisma.chatbotFaq.createMany({
      data: [
        { question: '¿Cómo reservo un espacio?', answer: 'Ve a Buscar Espacios, selecciona fecha y horario, elige un espacio disponible y confirma.', category: 'Reservations' },
        { question: '¿Cómo cancelo una reserva?', answer: 'Entra a Mis Reservas, selecciona la reserva futura y presiona Cancelar.', category: 'Reservations' },
        { question: '¿Qué significa NO_SHOW?', answer: 'Indica que el usuario no se presentó a una reserva ya finalizada. Solo el administrador la marca.', category: 'Policies' },
        { question: '¿Qué significa mantenimiento?', answer: 'Un espacio en mantenimiento no puede reservarse temporalmente.', category: 'Spaces' },
        { question: '¿Dónde veo mis reservas?', answer: 'En la sección Mis Reservas, con tus reservas futuras, finalizadas, canceladas y NO_SHOW.', category: 'General' },
        { question: '¿Cómo contacto al administrador?', answer: 'Si tu usuario está inactivo o bloqueado, contacta al administrador de tu organización.', category: 'Users' },
      ],
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed completado: roles, usuarios, recursos, espacios y FAQ.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * OfficeSpace — Prisma seed
 *
 * Crea datos base (roles, usuarios, recursos, espacios, FAQ) y, además, un
 * dataset de DEMOSTRACIÓN para que el dashboard se vea completo en el hackathon
 * (reservas variadas, asistencia, recurrentes pendientes, notificaciones y
 * auditoría).
 *
 * Idempotencia:
 *   - Base: upsert por campos únicos; espacios solo si faltan (name no es único).
 *   - Demo: los datos demo llevan marcador y se BORRAN antes de regenerarse:
 *       · Reservas/Notificaciones: marcador "[DEMO_DASHBOARD]".
 *       · Auditoría: ipAddress = "DEMO_SEED".
 *     Nunca se borran usuarios, roles ni credenciales.
 *
 * Seguridad de datos:
 *   - No se crean reservas CONFIRMED solapadas en el mismo espacio (respeta la
 *     exclusion constraint `no_overlapping_bookings`).
 */
import {
  PrismaClient,
  UserStatus,
  SpaceStatus,
  ResourceStatus,
  BookingStatus,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;
const DEMO_TAG = '[DEMO_DASHBOARD]';
const DEMO_AUDIT_IP = 'DEMO_SEED';
const TZ = 'America/Mexico_City';

// ---------- Utilidades de fecha/hora (UTC puro para columnas Date/Time) ----------
function todayInTz(): { dateStr: string; hour: number; dow: number } {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(now),
  );
  const dow = new Date(`${dateStr}T00:00:00.000Z`).getUTCDay(); // 0=Dom..6=Sáb
  return { dateStr, hour, dow };
}
function dayOffset(baseStr: string, n: number): string {
  const d = new Date(`${baseStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function dateOnly(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}
function timeOnly(h: number, m = 0): Date {
  return new Date(`1970-01-01T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`);
}

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

  const carlos = await prisma.user.upsert({
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

  const ana = await prisma.user.upsert({
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

  // ---- Recursos (catálogo base en inglés + recursos demo en español) ----
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
    // Demo (español)
    'WiFi',
    'Pantalla',
    'Proyector',
    'Pizarra',
    'Videoconferencia',
    'Bocinas',
    'HDMI',
    'Café',
    'Aire acondicionado',
    'Mesa colaborativa',
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

  // ---- Espacios base (solo si la tabla está vacía) ----
  const existingSpaces = await prisma.space.count();
  if (existingSpaces === 0) {
    const baseSpaces = [
      { name: 'Sala Creativa', spaceType: 'Meeting Room Medium', capacity: 8, floor: 'Piso 1', zone: 'Norte', resources: ['Projector', 'Whiteboard', 'Internet', 'Air Conditioning'] },
      { name: 'Sala Ejecutiva', spaceType: 'Executive Room', capacity: 12, floor: 'Piso 2', zone: 'Sur', resources: ['TV', 'Video Conference', 'Internet', 'Air Conditioning'] },
      { name: 'Sala Capacitación', spaceType: 'Training Room', capacity: 20, floor: 'Piso 2', zone: 'Centro', resources: ['Projector', 'Screen', 'Audio System', 'Internet'] },
      { name: 'Sala Entrevistas', spaceType: 'Interview Room', capacity: 4, floor: 'Piso 1', zone: 'Sur', resources: ['Internet', 'Air Conditioning'] },
      { name: 'Escritorio A-01', spaceType: 'Desk', capacity: 1, floor: 'Piso 1', zone: 'Norte', resources: ['Internet', 'Power Outlets'] },
      { name: 'Cabina Video 01', spaceType: 'Video Booth', capacity: 1, floor: 'Piso 3', zone: 'Centro', resources: ['Video Conference', 'Internet'] },
      { name: 'Cowork Norte', spaceType: 'Cowork Area', capacity: 15, floor: 'Piso 1', zone: 'Norte', resources: ['Internet', 'Power Outlets', 'Air Conditioning'] },
    ];
    for (const s of baseSpaces) {
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

  // ---- FAQ base ----
  const existingFaq = await prisma.chatbotFaq.count();
  if (existingFaq === 0) {
    await prisma.chatbotFaq.createMany({
      data: [
        { question: '¿Cómo reservo un espacio?', answer: 'Ve a Espacios, selecciona fecha y horario, elige un espacio disponible y confirma.', category: 'Reservations' },
        { question: '¿Cómo cancelo una reserva?', answer: 'Entra a Mis Reservas, selecciona la reserva futura y presiona Cancelar.', category: 'Reservations' },
        { question: '¿Qué significa NO_SHOW?', answer: 'Indica que el usuario no se presentó a una reserva ya finalizada. Solo el administrador la marca.', category: 'Policies' },
        { question: '¿Qué significa mantenimiento?', answer: 'Un espacio en mantenimiento no puede reservarse temporalmente.', category: 'Spaces' },
        { question: '¿Dónde veo mis reservas?', answer: 'En la sección Mis Reservas, con tus reservas futuras, finalizadas, canceladas y NO_SHOW.', category: 'General' },
        { question: '¿Cómo contacto al administrador?', answer: 'Si tu usuario está inactivo o bloqueado, contacta al administrador de tu organización.', category: 'Users' },
      ],
    });
  }

  // ===================== DATASET DE DEMOSTRACIÓN =====================
  await seedDemoDashboard(admin.id, ana.id, carlos.id, resources);

  // eslint-disable-next-line no-console
  console.log('Seed completado: base + dataset de demostración del dashboard.');
}

/** Garantiza la existencia de un espacio por nombre (name no es único). */
async function ensureSpace(
  adminId: string,
  resources: Record<string, string>,
  s: { name: string; spaceType: string; capacity: number; floor: string; zone: string; status: SpaceStatus; resources: string[] },
): Promise<{ id: string; name: string; capacity: number; status: SpaceStatus }> {
  let space = await prisma.space.findFirst({ where: { name: s.name } });
  if (!space) {
    space = await prisma.space.create({
      data: {
        name: s.name,
        spaceType: s.spaceType,
        capacity: s.capacity,
        floor: s.floor,
        zone: s.zone,
        status: s.status,
        createdBy: adminId,
      },
    });
  } else {
    space = await prisma.space.update({ where: { id: space.id }, data: { status: s.status } });
  }
  await prisma.spaceResource.createMany({
    data: s.resources.filter((rn) => resources[rn]).map((rn) => ({ spaceId: space!.id, resourceId: resources[rn] })),
    skipDuplicates: true,
  });
  return { id: space.id, name: space.name, capacity: space.capacity, status: space.status };
}

async function seedDemoDashboard(
  adminId: string,
  anaId: string,
  carlosId: string,
  resources: Record<string, string>,
): Promise<void> {
  // 1) Limpieza idempotente de datos demo previos (no toca usuarios/roles).
  await prisma.booking.deleteMany({ where: { purpose: { contains: DEMO_TAG } } });
  await prisma.notification.deleteMany({ where: { message: { contains: DEMO_TAG } } });
  await prisma.auditLog.deleteMany({ where: { ipAddress: DEMO_AUDIT_IP } });

  // 2) Espacios demo (10), con recursos y estados variados.
  const demoSpaceDefs = [
    { name: 'Sala Ejecutiva Norte', spaceType: 'MEETING_ROOM', capacity: 10, floor: 'Piso 3', zone: 'Norte', status: SpaceStatus.AVAILABLE, resources: ['WiFi', 'Pantalla', 'Videoconferencia', 'Aire acondicionado'] },
    { name: 'Sala Creativa Menta', spaceType: 'MEETING_ROOM', capacity: 6, floor: 'Piso 2', zone: 'Colaborativa', status: SpaceStatus.AVAILABLE, resources: ['WiFi', 'Pizarra', 'Mesa colaborativa'] },
    { name: 'Cabina Focus 01', spaceType: 'FOCUS_ROOM', capacity: 1, floor: 'Piso 1', zone: 'Silenciosa', status: SpaceStatus.AVAILABLE, resources: ['WiFi', 'HDMI'] },
    { name: 'Cabina Focus 02', spaceType: 'FOCUS_ROOM', capacity: 1, floor: 'Piso 1', zone: 'Silenciosa', status: SpaceStatus.AVAILABLE, resources: ['WiFi'] },
    { name: 'Auditorio Ámbar', spaceType: 'AUDITORIUM', capacity: 40, floor: 'Piso 4', zone: 'Eventos', status: SpaceStatus.AVAILABLE, resources: ['WiFi', 'Proyector', 'Bocinas', 'Pantalla'] },
    { name: 'Sala Sprint Azul', spaceType: 'MEETING_ROOM', capacity: 8, floor: 'Piso 2', zone: 'Agile', status: SpaceStatus.AVAILABLE, resources: ['WiFi', 'Pizarra', 'Pantalla'] },
    { name: 'Sala Consejo Graphite', spaceType: 'BOARD_ROOM', capacity: 14, floor: 'Piso 5', zone: 'Dirección', status: SpaceStatus.AVAILABLE, resources: ['WiFi', 'Videoconferencia', 'Pantalla', 'Café'] },
    { name: 'Open Desk Flex A', spaceType: 'DESK', capacity: 4, floor: 'Piso 1', zone: 'Operativa', status: SpaceStatus.AVAILABLE, resources: ['WiFi', 'Mesa colaborativa'] },
    { name: 'Laboratorio Innovación', spaceType: 'LAB', capacity: 12, floor: 'Piso 3', zone: 'Innovación', status: SpaceStatus.MAINTENANCE, resources: ['WiFi', 'Proyector', 'Pizarra'] },
    { name: 'Sala Training', spaceType: 'TRAINING_ROOM', capacity: 20, floor: 'Piso 4', zone: 'Capacitación', status: SpaceStatus.AVAILABLE, resources: ['WiFi', 'Proyector', 'Bocinas', 'Pantalla'] },
  ];
  const demoSpaces = [];
  for (const def of demoSpaceDefs) demoSpaces.push(await ensureSpace(adminId, resources, def));
  const bookable = demoSpaces.filter((s) => s.status === SpaceStatus.AVAILABLE); // 9

  // 3) Generador de reservas (sin solapar CONFIRMED por espacio+día).
  const rows: Prisma.BookingCreateManyInput[] = [];
  const counts: Record<string, number> = {};
  const confirmedSlots = new Map<string, [number, number][]>();
  const owners = [anaId, carlosId, adminId];
  let ownerIdx = 0;
  const nextOwner = () => owners[ownerIdx++ % owners.length];

  const purposes = [
    'Reunión de planeación',
    'Daily de equipo',
    'Entrevista de candidato',
    'Revisión de sprint',
    'Sesión de diseño',
    'Capacitación interna',
    'Comité de dirección',
    'Demo de producto',
    'Llamada con cliente',
    'Retrospectiva',
  ];
  let pIdx = 0;
  const nextPurpose = () => purposes[pIdx++ % purposes.length];

  function slotFree(spaceId: string, dateStr: string, s: number, e: number): boolean {
    const arr = confirmedSlots.get(`${spaceId}|${dateStr}`) ?? [];
    return !arr.some(([a, b]) => a < e && s < b);
  }
  function reserve(spaceId: string, dateStr: string, s: number, e: number): void {
    const k = `${spaceId}|${dateStr}`;
    const arr = confirmedSlots.get(k) ?? [];
    arr.push([s, e]);
    confirmedSlots.set(k, arr);
  }
  function add(
    status: BookingStatus,
    space: { id: string; capacity: number },
    dateStr: string,
    sh: number,
    eh: number,
    ownerId: string,
    // Nota: tipado laxo a propósito. Los campos de recurrencia
    // (recurrenceStartDate, etc.) existen en el cliente Prisma generado en
    // Docker/local, pero pueden faltar en un cliente stale del entorno de
    // compilación. El spread evita el chequeo de propiedades en exceso.
    opts: Record<string, unknown> = {},
  ): boolean {
    if (status === BookingStatus.CONFIRMED) {
      if (!slotFree(space.id, dateStr, sh * 60, eh * 60)) return false;
      reserve(space.id, dateStr, sh * 60, eh * 60);
    }
    rows.push({
      userId: ownerId,
      spaceId: space.id,
      createdBy: adminId,
      bookingDate: dateOnly(dateStr),
      startTime: timeOnly(sh),
      endTime: timeOnly(eh),
      attendeesCount: Math.max(1, Math.min(space.capacity, 3)),
      purpose: `${nextPurpose()} ${DEMO_TAG}`,
      status,
      ...opts,
    });
    counts[status] = (counts[status] ?? 0) + 1;
    return true;
  }

  const { dateStr: today, hour: nowH, dow } = todayInTz();

  // --- A) Reservas de HOY (CONFIRMED) ---
  // Activas AHORA (si la hora actual cae en horario laboral).
  if (nowH >= 8 && nowH <= 16) {
    add(BookingStatus.CONFIRMED, bookable[0], today, nowH, Math.min(nowH + 2, 18), nextOwner());
    add(BookingStatus.CONFIRMED, bookable[1], today, nowH, Math.min(nowH + 1, 18), nextOwner());
    if (bookable[6]) add(BookingStatus.CONFIRMED, bookable[6], today, nowH, Math.min(nowH + 1, 18), nextOwner());
  }
  // Otras de hoy (pasadas y futuras del mismo día) en horas fijas.
  const todayPlan: Array<[number, number, number]> = [
    [2, 8, 9],
    [3, 9, 10],
    [0, 11, 12],
    [1, 13, 14],
    [4, 10, 11],
    [5, 14, 15],
    [6, 16, 17],
    [7, 15, 16],
    [2, 12, 13],
    [3, 16, 17],
  ];
  for (const [idx, sh, eh] of todayPlan) {
    if (bookable[idx]) add(BookingStatus.CONFIRMED, bookable[idx], today, sh, eh, nextOwner());
  }

  // --- B) Reservas de ESTA SEMANA (Lun–Vie, excluyendo hoy) con horas pico ---
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  for (let d = 0; d < 5; d++) {
    const dateStr = dayOffset(today, mondayOffset + d);
    if (dateStr === today) continue;
    // Horas con sesgo a picos 09–11 y 15–16, distribuidas para ranking.
    const plan: Array<[number, number, number]> = [
      [0, 9, 10],
      [1, 9, 11],
      [0, 10, 11],
      [5, 15, 16],
      [2, 9, 10],
      [4, 10, 11],
      [6, 15, 16],
      [3, 11, 12],
      [0, 15, 16],
    ];
    for (const [idx, sh, eh] of plan) {
      if (bookable[idx]) add(BookingStatus.CONFIRMED, bookable[idx], dateStr, sh, eh, nextOwner());
    }
  }

  // --- C) Reservas del MES (días pasados): asistencia + variedad ---
  // 8 ATTENDED y 4 NO_SHOW en días previos.
  const pastDays = [-3, -4, -5, -6, -7, -8, -9, -10, -11, -12, -13, -14];
  for (let i = 0; i < 8; i++) {
    const dateStr = dayOffset(today, pastDays[i % pastDays.length]);
    const sp = bookable[i % bookable.length];
    add(BookingStatus.ATTENDED, sp, dateStr, 9 + (i % 6), 10 + (i % 6), nextOwner());
  }
  for (let i = 0; i < 4; i++) {
    const dateStr = dayOffset(today, pastDays[(i + 2) % pastDays.length]);
    const sp = bookable[(i + 3) % bookable.length];
    add(BookingStatus.NO_SHOW, sp, dateStr, 13 + (i % 4), 14 + (i % 4), nextOwner());
  }
  // CONFIRMED pasadas adicionales del mes (enriquecen mensual + ranking).
  for (let i = 0; i < 10; i++) {
    const dateStr = dayOffset(today, pastDays[i % pastDays.length]);
    const sp = bookable[i % 3]; // sesga a las 3 primeras salas (ranking)
    add(BookingStatus.CONFIRMED, sp, dateStr, 9 + (i % 7), 10 + (i % 7), nextOwner());
  }

  // --- D) Solicitudes recurrentes PENDING_APPROVAL (5) ---
  const freqs = ['DAILY', 'WEEKLY', 'MONTHLY', 'WEEKLY', 'DAILY'];
  for (let i = 0; i < 5; i++) {
    const start = dayOffset(today, 3 + i);
    const end = dayOffset(today, 30 + i * 7);
    const sp = bookable[(i + 2) % bookable.length];
    add(BookingStatus.PENDING_APPROVAL, sp, start, 9 + (i % 5), 10 + (i % 5), nextOwner(), {
      isRecurring: true,
      recurrenceStartDate: dateOnly(start),
      recurrenceEndDate: dateOnly(end),
      recurrenceFrequency: freqs[i],
    });
  }

  // --- E) CANCELADAS / LIBERADAS (4), recientes o futuras ---
  for (let i = 0; i < 4; i++) {
    const dateStr = dayOffset(today, i - 1); // ayer..+2
    const sp = bookable[(i + 4) % bookable.length];
    add(BookingStatus.CANCELLED, sp, dateStr, 11 + (i % 4), 12 + (i % 4), nextOwner());
  }

  // Inserción por lotes.
  await prisma.booking.createMany({ data: rows, skipDuplicates: true });

  // 4) Notificaciones demo (algunas leídas / no leídas).
  const notif = (userId: string, title: string, message: string, isRead: boolean) => ({
    userId,
    title,
    message: `${message} ${DEMO_TAG}`,
    isRead,
  });
  await prisma.notification.createMany({
    data: [
      // Admin
      notif(adminId, 'Solicitudes recurrentes', 'Tienes solicitudes recurrentes pendientes por revisar.', false),
      notif(adminId, 'Mantenimiento', 'La sala Laboratorio Innovación está en mantenimiento.', false),
      notif(adminId, 'Espacio liberado', 'Una reserva fue liberada anticipadamente.', true),
      notif(adminId, 'Alta ocupación', 'Alta ocupación detectada entre 09:00 y 11:00.', false),
      // Ana
      notif(anaId, 'Reserva confirmada', 'Tu reserva fue confirmada.', true),
      notif(anaId, 'Solicitud recurrente', 'Tu solicitud recurrente está pendiente de aprobación.', false),
      notif(anaId, 'Asistencia verificada', 'Tu asistencia fue marcada como verificada.', true),
      // Carlos
      notif(carlosId, 'Reserva cancelada', 'Tu reserva fue cancelada y el espacio liberado.', false),
      notif(carlosId, 'Reserva confirmada', 'Tu reserva fue confirmada.', true),
      notif(carlosId, 'Solicitud recurrente', 'Tu solicitud recurrente está pendiente de aprobación.', false),
    ],
  });

  // 5) Auditoría demo (ipAddress = DEMO_SEED como marcador).
  const audit = (action: string, entityType: string, newValues: Prisma.InputJsonValue) => ({
    userId: adminId,
    action,
    entityType,
    success: true,
    ipAddress: DEMO_AUDIT_IP,
    newValues,
  });
  await prisma.auditLog.createMany({
    data: [
      audit('CREATE_BOOKING', 'BOOKING', { demo: true, note: 'Reserva creada (demo)' }),
      audit('CANCEL_BOOKING', 'BOOKING', { demo: true, note: 'Reserva cancelada (demo)' }),
      audit('RELEASE_BOOKING', 'BOOKING', { demo: true, note: 'Espacio liberado (demo)' }),
      audit('APPROVE_BOOKING', 'BOOKING', { demo: true, note: 'Recurrente aprobada (demo)' }),
      audit('MARK_ATTENDED', 'BOOKING', { demo: true, note: 'Asistencia verificada (demo)' }),
      audit('MARK_NO_SHOW', 'BOOKING', { demo: true, note: 'NO_SHOW marcado (demo)' }),
      audit('CREATE_SPACE', 'SPACE', { demo: true, note: 'Espacio creado (demo)' }),
      audit('UPDATE_SPACE', 'SPACE', { demo: true, note: 'Espacio actualizado (demo)' }),
      audit('CHANGE_SPACE_STATUS', 'SPACE', { demo: true, note: 'Estado de espacio cambiado (demo)' }),
    ],
  });

  // eslint-disable-next-line no-console
  console.log(
    `Demo dashboard: espacios=${demoSpaces.length} reservas=${rows.length} por estado=${JSON.stringify(counts)}`,
  );
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

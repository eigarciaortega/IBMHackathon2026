import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Booking, BookingStatus, Prisma, SpaceStatus, UserStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuditAction, AuditEntity } from '../../audit/constants/audit.constants';
import { AuditService } from '../../audit/audit.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { Role } from '../../common/constants/roles.constant';
import { OwnershipResolver } from '../../common/decorators/ownership.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AvailabilityQueryDto } from '../dto/availability-query.dto';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { QueryBookingsDto } from '../dto/query-bookings.dto';
import { ValidateBookingDto } from '../dto/validate-booking.dto';
import { BookingsRepository } from '../repositories/bookings.repository';
import {
  formatDate,
  formatTime,
  isPast,
  normalizeTime,
  nowInOfficeTz,
  timesOverlap,
  toDateOnly,
  toTimeOnly,
} from '../utils/time.util';

/** Máximo de reservas futuras activas para COLLABORATOR (decisión H-04). */
const MAX_FUTURE_ACTIVE_BOOKINGS = 5;
const LIMIT_MESSAGE = 'You have reached the maximum limit of 5 active future bookings.';

interface BookingInput {
  spaceId: string;
  date: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
}

@Injectable()
export class BookingsService implements OwnershipResolver {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // -------- OwnershipResolver (S-03) --------
  async isOwner(resourceId: string, userId: string): Promise<boolean> {
    const booking = await this.bookingsRepository.findById(resourceId);
    if (!booking) {
      return true; // dejar que el servicio responda 404
    }
    return booking.userId === userId;
  }

  // -------- Derivación de FINISHED (H-02) --------
  private effectiveStatus(booking: Pick<Booking, 'status' | 'bookingDate' | 'endTime'>): BookingStatus {
    if (
      booking.status === BookingStatus.CONFIRMED &&
      isPast(formatDate(booking.bookingDate), formatTime(booking.endTime))
    ) {
      return BookingStatus.FINISHED;
    }
    return booking.status;
  }

  private toResponse(booking: Booking & Record<string, unknown>) {
    return {
      ...booking,
      bookingDate: formatDate(booking.bookingDate),
      startTime: formatTime(booking.startTime),
      endTime: formatTime(booking.endTime),
      status: this.effectiveStatus(booking), // FINISHED derivado, no persistido
    };
  }

  // -------- Validaciones de reserva --------
  /**
   * Ejecuta todas las validaciones de negocio. Lanza la excepción HTTP
   * correspondiente. Devuelve el espacio cargado si todo es válido.
   */
  private async runValidations(
    input: BookingInput,
    currentUser: AuthenticatedUser,
    opts: { skipOverlap?: boolean; skipLimit?: boolean } = {},
  ) {
    const start = normalizeTime(input.startTime);
    const end = normalizeTime(input.endTime);

    // Coherencia temporal (RN-032 / RN-033)
    if (start >= end) {
      throw new BadRequestException('La hora de fin debe ser mayor a la hora de inicio.');
    }
    // Fecha/hora no pasada (RN-031)
    if (isPast(input.date, start)) {
      throw new BadRequestException('No se permiten reservas en el pasado.');
    }

    // Espacio existente (RN-036) y disponible (RN-022)
    const space = await this.bookingsRepository.findSpaceById(input.spaceId);
    if (!space) {
      throw new NotFoundException('Espacio no encontrado.');
    }
    if (space.status !== SpaceStatus.AVAILABLE) {
      throw new BadRequestException('El espacio no está disponible para reservas.');
    }

    // Usuario activo (RN-037)
    const actor = await this.bookingsRepository.findUserById(currentUser.id);
    if (!actor || actor.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Tu usuario no está activo para crear reservas.');
    }

    // Capacidad (RN-034)
    if (input.attendeesCount > space.capacity) {
      throw new BadRequestException('La capacidad del espacio es insuficiente.');
    }

    // Límite de 5 para COLLABORATOR (H-04). No aplica a solicitudes recurrentes
    // (aún no son reservas activas; se cuentan al aprobarse).
    if (currentUser.role !== Role.ADMIN && !opts.skipLimit) {
      const activeFuture = await this.countActiveFutureBookings(currentUser.id);
      if (activeFuture >= MAX_FUTURE_ACTIVE_BOOKINGS) {
        throw new ConflictException(LIMIT_MESSAGE);
      }
    }

    // Solapamiento a nivel aplicación (RN-045..RN-052). Consecutivas permitidas.
    // Las solicitudes recurrentes PENDING_APPROVAL no validan solapamiento aquí;
    // se verifica al momento de la aprobación por el administrador.
    if (!opts.skipOverlap) {
      const sameDay = await this.bookingsRepository.findConfirmedBySpaceAndDate(
        input.spaceId,
        toDateOnly(input.date),
      );
      const conflict = sameDay.some((b) =>
        timesOverlap(start, end, formatTime(b.startTime), formatTime(b.endTime)),
      );
      if (conflict) {
        throw new ConflictException('El espacio ya se encuentra reservado para ese horario.');
      }
    }

    return { space, start, end };
  }

  /** Valida los campos de un rango recurrente (PARTE 5). */
  private validateRecurrence(dto: CreateBookingDto) {
    const { recurrenceStartDate, recurrenceEndDate, recurrenceFrequency } = dto;
    if (!recurrenceStartDate || !recurrenceEndDate || !recurrenceFrequency) {
      throw new BadRequestException(
        'Una reserva recurrente requiere fecha de inicio, fecha de fin y frecuencia.',
      );
    }
    if (recurrenceEndDate < recurrenceStartDate) {
      throw new BadRequestException('La fecha de fin debe ser igual o posterior a la de inicio.');
    }
    const today = nowInOfficeTz().date;
    if (recurrenceStartDate < today) {
      throw new BadRequestException('La recurrencia no puede iniciar en el pasado.');
    }
  }

  /**
   * Sugerencias de horarios disponibles para un espacio en una fecha (PARTE 4).
   * Horario laboral 08:00–18:00, intervalos de 30 min, duración configurable.
   * Considera solo reservas CONFIRMED y descarta horarios pasados/solapados.
   */
  async getAvailability(query: AvailabilityQueryDto) {
    const duration = query.durationMinutes && query.durationMinutes > 0 ? query.durationMinutes : 60;
    const WORK_START = 8 * 60; // 08:00
    const WORK_END = 18 * 60; // 18:00
    const STEP = 30;

    const space = await this.bookingsRepository.findSpaceById(query.spaceId);
    if (!space) {
      throw new NotFoundException('Espacio no encontrado.');
    }

    const confirmed = await this.bookingsRepository.findConfirmedBySpaceAndDate(
      query.spaceId,
      toDateOnly(query.date),
    );
    const busy = confirmed.map((b) => ({
      start: formatTime(b.startTime),
      end: formatTime(b.endTime),
    }));

    const toHHMM = (mins: number) =>
      `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

    const slots: { startTime: string; endTime: string; available: boolean }[] = [];
    for (let s = WORK_START; s + duration <= WORK_END; s += STEP) {
      const start = `${toHHMM(s)}:00`;
      const end = `${toHHMM(s + duration)}:00`;
      const past = isPast(query.date, start);
      const overlap = busy.some((b) => timesOverlap(start, end, b.start, b.end));
      const available = !past && !overlap;
      if (!past) {
        slots.push({ startTime: toHHMM(s), endTime: toHHMM(s + duration), available });
      }
    }
    return slots;
  }

  /** Cuenta reservas CONFIRMED efectivamente futuras (no finalizadas) del usuario. */
  private async countActiveFutureBookings(userId: string): Promise<number> {
    const now = nowInOfficeTz();
    const fromDate = toDateOnly(now.date);
    const candidates = await this.bookingsRepository.findConfirmedByUserFrom(userId, fromDate);
    return candidates.filter(
      (b) => this.effectiveStatus(b) === BookingStatus.CONFIRMED,
    ).length;
  }

  private isExclusionConstraintError(error: unknown): boolean {
    return (
      error instanceof Error &&
      /no_overlapping_bookings|23P01|exclusion/i.test(error.message)
    );
  }

  // -------- Casos de uso --------

  async create(dto: CreateBookingDto, currentUser: AuthenticatedUser, ipAddress?: string) {
    const isRecurring = dto.isRecurring === true;

    if (isRecurring) {
      this.validateRecurrence(dto);
    }

    // Solicitud recurrente → requiere aprobación del administrador (PENDING_APPROVAL).
    const { start, end } = await this.runValidations(dto, currentUser, {
      skipOverlap: isRecurring,
      skipLimit: isRecurring,
    });

    const data: Prisma.BookingCreateInput = {
      bookingDate: toDateOnly(dto.date),
      startTime: toTimeOnly(start),
      endTime: toTimeOnly(end),
      attendeesCount: dto.attendeesCount,
      purpose: dto.purpose,
      status: isRecurring ? BookingStatus.PENDING_APPROVAL : BookingStatus.CONFIRMED,
      isRecurring,
      user: { connect: { id: currentUser.id } },
      creator: { connect: { id: currentUser.id } }, // H-09: created_by
      space: { connect: { id: dto.spaceId } },
    };
    if (isRecurring) {
      // Campos de recurrencia (requieren `prisma generate` tras la migración).
      Object.assign(data, {
        recurringGroupId: randomUUID(),
        recurrenceStartDate: toDateOnly(dto.recurrenceStartDate as string),
        recurrenceEndDate: toDateOnly(dto.recurrenceEndDate as string),
        recurrenceFrequency: dto.recurrenceFrequency,
      });
    }

    let booking;
    try {
      booking = await this.bookingsRepository.create(data);
    } catch (error) {
      // Doble protección (BD-01): si la Exclusion Constraint detecta el solape
      // en una condición de carrera, devolvemos 409.
      if (this.isExclusionConstraintError(error)) {
        throw new ConflictException('El espacio ya se encuentra reservado para ese horario.');
      }
      throw error;
    }

    await this.auditService.record({
      userId: currentUser.id,
      action: AuditAction.CREATE_BOOKING,
      entityType: AuditEntity.BOOKING,
      entityId: booking.id,
      success: true,
      newValues: { spaceId: dto.spaceId, date: dto.date, start, end, isRecurring },
      ipAddress,
    });

    // Notificación interna (H-07) al propietario.
    if (isRecurring) {
      await this.notificationsService.create(
        currentUser.id,
        'Solicitud recurrente enviada',
        `Tu solicitud de reserva recurrente de "${booking.space?.name ?? 'Espacio'}" se envió al administrador para aprobación.`,
      );
    } else {
      await this.notificationsService.notifyBookingCreated(
        currentUser.id,
        booking.space?.name ?? 'Espacio',
        dto.date,
        start,
      );
    }

    return this.toResponse(booking);
  }

  /** Valida disponibilidad sin crear (POST /bookings/validate). */
  async validate(dto: ValidateBookingDto, currentUser: AuthenticatedUser) {
    try {
      await this.runValidations(dto, currentUser);
      return { available: true };
    } catch (error) {
      return {
        available: false,
        reason: error instanceof Error ? error.message : 'No disponible',
      };
    }
  }

  async findAll(query: QueryBookingsDto, currentUser: AuthenticatedUser) {
    const isAdmin = currentUser.role === Role.ADMIN;
    const result = await this.bookingsRepository.findMany({
      date: query.date ? toDateOnly(query.date) : undefined,
      status: query.status,
      spaceId: query.spaceId,
      // COLLABORATOR solo ve las propias (RN-010); ignora userId del query.
      userId: isAdmin ? query.userId : currentUser.id,
      page: query.page,
      limit: query.limit,
    });
    return { ...result, items: result.items.map((b) => this.toResponse(b)) };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const booking = await this.bookingsRepository.findById(id);
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }
    if (currentUser.role !== Role.ADMIN && booking.userId !== currentUser.id) {
      throw new ForbiddenException('No tienes permisos sobre esta reserva.');
    }
    return this.toResponse(booking);
  }

  /**
   * Genera un archivo .ics (RFC 5545) para una reserva.
   * Reglas: solo el dueño o ADMIN; solo CONFIRMED o ATTENDED.
   */
  async getCalendarIcs(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ filename: string; content: string }> {
    const booking = await this.bookingsRepository.findById(id);
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }
    if (currentUser.role !== Role.ADMIN && booking.userId !== currentUser.id) {
      throw new ForbiddenException('No tienes permisos sobre esta reserva.');
    }
    const status = this.effectiveStatus(booking);
    if (status !== BookingStatus.CONFIRMED && status !== BookingStatus.ATTENDED) {
      throw new BadRequestException(
        'Solo se pueden exportar reservas confirmadas o con asistencia verificada.',
      );
    }

    const b = booking as Booking & {
      space?: { name?: string; floor?: string; zone?: string; spaceType?: string };
      purpose?: string;
    };
    const date = formatDate(booking.bookingDate); // YYYY-MM-DD
    const start = formatTime(booking.startTime).slice(0, 8); // HH:MM:SS
    const end = formatTime(booking.endTime).slice(0, 8);
    const spaceName = b.space?.name ?? 'Espacio';
    const location = [b.space?.name, b.space?.floor, b.space?.zone].filter(Boolean).join(', ');
    const content = this.buildIcs({
      uid: `${id}@officespace`,
      date,
      start,
      end,
      summary: `Reserva: ${spaceName}`,
      location,
      description: b.purpose ?? 'Reserva de espacio en OfficeSpace.',
    });
    return { filename: `reserva-${spaceName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`, content };
  }

  /** Construye el contenido .ics (TZID America/Mexico_City, sin DST). */
  private buildIcs(e: {
    uid: string;
    date: string;
    start: string;
    end: string;
    summary: string;
    location: string;
    description: string;
  }): string {
    const esc = (s: string) =>
      s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const dt = (date: string, time: string) =>
      `${date.replace(/-/g, '')}T${time.replace(/:/g, '')}`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OfficeSpace//Reservation System//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE',
      'TZID:America/Mexico_City',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:-0600',
      'TZOFFSETTO:-0600',
      'TZNAME:CST',
      'END:STANDARD',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=America/Mexico_City:${dt(e.date, e.start)}`,
      `DTEND;TZID=America/Mexico_City:${dt(e.date, e.end)}`,
      `SUMMARY:${esc(e.summary)}`,
      `LOCATION:${esc(e.location)}`,
      `DESCRIPTION:${esc(e.description)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    return lines.join('\r\n') + '\r\n';
  }

  async myBookings(currentUser: AuthenticatedUser) {
    const result = await this.bookingsRepository.findMany({
      userId: currentUser.id,
      limit: 100,
    });
    return result.items.map((b) => this.toResponse(b));
  }

  async upcoming(currentUser: AuthenticatedUser) {
    const now = nowInOfficeTz();
    const candidates = await this.bookingsRepository.findConfirmedByUserFrom(
      currentUser.id,
      toDateOnly(now.date),
    );
    return candidates
      .filter((b) => this.effectiveStatus(b) === BookingStatus.CONFIRMED)
      .map((b) => this.toResponse(b))
      .sort((a, b) =>
        `${a.bookingDate}T${a.startTime}`.localeCompare(`${b.bookingDate}T${b.startTime}`),
      );
  }

  async history(currentUser: AuthenticatedUser) {
    const result = await this.bookingsRepository.findMany({
      userId: currentUser.id,
      limit: 100,
    });
    return result.items.map((b) => this.toResponse(b));
  }

  async cancel(id: string, currentUser: AuthenticatedUser, ipAddress?: string) {
    const booking = await this.bookingsRepository.findById(id);
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }
    if (currentUser.role !== Role.ADMIN && booking.userId !== currentUser.id) {
      throw new ForbiddenException('No tienes permisos sobre esta reserva.'); // RN-040
    }
    const effective = this.effectiveStatus(booking);
    if (effective !== BookingStatus.CONFIRMED) {
      // No se cancela finalizada/cancelada/no_show (RN-041)
      throw new BadRequestException('Solo se pueden cancelar reservas futuras confirmadas.');
    }

    const updated = await this.bookingsRepository.updateStatus(id, BookingStatus.CANCELLED);
    await this.auditService.record({
      userId: currentUser.id,
      action: AuditAction.CANCEL_BOOKING,
      entityType: AuditEntity.BOOKING,
      entityId: id,
      success: true,
      oldValues: { status: BookingStatus.CONFIRMED },
      newValues: { status: BookingStatus.CANCELLED },
      ipAddress,
    });

    // Notificación interna (H-07): reserva cancelada → al propietario de la reserva.
    await this.notificationsService.notifyBookingCancelled(
      booking.userId,
      booking.space?.name ?? 'Espacio',
      formatDate(booking.bookingDate),
      formatTime(booking.startTime),
    );

    return this.toResponse(updated);
  }

  /** Marcar NO_SHOW: solo ADMIN, solo tras finalizar (RN-056/RN-057). */
  async markNoShow(id: string, adminUser: AuthenticatedUser, ipAddress?: string) {
    const booking = await this.bookingsRepository.findById(id);
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Solo una reserva confirmada puede marcarse como NO_SHOW.');
    }
    if (!isPast(formatDate(booking.bookingDate), formatTime(booking.endTime))) {
      throw new BadRequestException('La reserva aún no puede marcarse como NO_SHOW.');
    }

    const updated = await this.bookingsRepository.updateStatus(id, BookingStatus.NO_SHOW);
    await this.auditService.record({
      userId: adminUser.id,
      action: AuditAction.MARK_NO_SHOW,
      entityType: AuditEntity.BOOKING,
      entityId: id,
      success: true,
      newValues: { status: BookingStatus.NO_SHOW },
      ipAddress,
    });
    return this.toResponse(updated);
  }

  /** Marcar ASISTENCIA verificada: solo ADMIN, solo tras finalizar la reserva. */
  async markAttended(id: string, adminUser: AuthenticatedUser, ipAddress?: string) {
    const booking = await this.bookingsRepository.findById(id);
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Solo una reserva confirmada puede marcarse como asistida.');
    }
    if (!isPast(formatDate(booking.bookingDate), formatTime(booking.endTime))) {
      throw new BadRequestException('La reserva aún no finaliza; no puede verificarse la asistencia.');
    }

    const updated = await this.bookingsRepository.updateStatus(id, BookingStatus.ATTENDED);
    await this.auditService.record({
      userId: adminUser.id,
      action: AuditAction.MARK_ATTENDED,
      entityType: AuditEntity.BOOKING,
      entityId: id,
      success: true,
      newValues: { status: BookingStatus.ATTENDED },
      ipAddress,
    });
    return this.toResponse(updated);
  }

  /**
   * Cola de verificación de asistencia: reservas CONFIRMED cuya hora ya terminó
   * (efectivamente FINISHED) y siguen sin verificar. Solo ADMIN.
   */
  async listToVerify() {
    const confirmed = await this.bookingsRepository.findAllConfirmed();
    return confirmed
      .filter((b) => isPast(formatDate(b.bookingDate), formatTime(b.endTime)))
      .map((b) => this.toResponse(b));
  }

  // -------- Reservas recurrentes (aprobación del administrador) --------

  /** Lista solicitudes recurrentes pendientes de aprobación (ADMIN). */
  async listPending() {
    const pending = await this.bookingsRepository.findAllPending();
    return pending.map((b) => this.toResponse(b));
  }

  /**
   * Aprobar una solicitud recurrente: valida disponibilidad AHORA y la confirma.
   * Solo ADMIN. Si hay solapamiento, devuelve 409 y permanece pendiente.
   */
  async approve(id: string, adminUser: AuthenticatedUser, ipAddress?: string) {
    const booking = await this.bookingsRepository.findById(id);
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }
    if (booking.status !== BookingStatus.PENDING_APPROVAL) {
      throw new BadRequestException('La reserva no está pendiente de aprobación.');
    }

    // Validación de disponibilidad al momento de aprobar (incluye solapamiento).
    await this.runValidations(
      {
        spaceId: booking.spaceId,
        date: formatDate(booking.bookingDate),
        startTime: formatTime(booking.startTime),
        endTime: formatTime(booking.endTime),
        attendeesCount: booking.attendeesCount,
      },
      { id: booking.userId, email: '', role: Role.COLLABORATOR },
      { skipLimit: true },
    );

    let updated;
    try {
      updated = await this.bookingsRepository.updateStatus(id, BookingStatus.CONFIRMED);
    } catch (error) {
      if (this.isExclusionConstraintError(error)) {
        throw new ConflictException('El espacio ya se encuentra reservado para ese horario.');
      }
      throw error;
    }

    await this.auditService.record({
      userId: adminUser.id,
      action: AuditAction.APPROVE_BOOKING,
      entityType: AuditEntity.BOOKING,
      entityId: id,
      success: true,
      newValues: { status: BookingStatus.CONFIRMED },
      ipAddress,
    });
    await this.notificationsService.create(
      booking.userId,
      'Reserva recurrente aprobada',
      `Tu reserva recurrente de "${booking.space?.name ?? 'Espacio'}" fue aprobada y confirmada.`,
    );
    return this.toResponse(updated);
  }

  /**
   * Liberar un espacio anticipadamente (ADMIN): cancela una reserva futura
   * CONFIRMED o PENDING_APPROVAL antes de que empiece, dejando el horario libre.
   * Si la reserva ya empezó/terminó → 400 (usar NO_SHOW/ATTENDED).
   */
  async release(id: string, adminUser: AuthenticatedUser, ipAddress?: string) {
    const booking = await this.bookingsRepository.findById(id);
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('La reserva ya está cancelada.');
    }
    if (
      booking.status !== BookingStatus.CONFIRMED &&
      booking.status !== BookingStatus.PENDING_APPROVAL
    ) {
      throw new BadRequestException('Solo se pueden liberar reservas confirmadas o pendientes.');
    }
    if (isPast(formatDate(booking.bookingDate), formatTime(booking.startTime))) {
      throw new BadRequestException(
        'La reserva ya inició o finalizó; usa NO_SHOW o asistencia en lugar de liberar.',
      );
    }

    const updated = await this.bookingsRepository.updateStatus(id, BookingStatus.CANCELLED);
    await this.auditService.record({
      userId: adminUser.id,
      action: AuditAction.RELEASE_BOOKING,
      entityType: AuditEntity.BOOKING,
      entityId: id,
      success: true,
      oldValues: { status: booking.status },
      newValues: { status: BookingStatus.CANCELLED, released: true },
      ipAddress,
    });
    await this.notificationsService.create(
      booking.userId,
      'Espacio liberado',
      `Tu reserva de "${booking.space?.name ?? 'Espacio'}" (${formatDate(booking.bookingDate)} ${formatTime(booking.startTime)}) fue cancelada por el administrador y el espacio quedó disponible.`,
    );
    return this.toResponse(updated);
  }

  /** Rechazar una solicitud recurrente (ADMIN): pasa a CANCELLED. */
  async reject(id: string, adminUser: AuthenticatedUser, ipAddress?: string) {
    const booking = await this.bookingsRepository.findById(id);
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }
    if (booking.status !== BookingStatus.PENDING_APPROVAL) {
      throw new BadRequestException('La reserva no está pendiente de aprobación.');
    }

    const updated = await this.bookingsRepository.updateStatus(id, BookingStatus.CANCELLED);
    await this.auditService.record({
      userId: adminUser.id,
      action: AuditAction.CANCEL_BOOKING,
      entityType: AuditEntity.BOOKING,
      entityId: id,
      success: true,
      newValues: { status: BookingStatus.CANCELLED, rejected: true },
      ipAddress,
    });
    await this.notificationsService.create(
      booking.userId,
      'Reserva recurrente rechazada',
      `Tu solicitud recurrente de "${booking.space?.name ?? 'Espacio'}" fue rechazada por el administrador.`,
    );
    return this.toResponse(updated);
  }
}

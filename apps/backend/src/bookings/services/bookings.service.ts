import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Booking, BookingStatus, SpaceStatus, UserStatus } from '@prisma/client';
import { AuditAction, AuditEntity } from '../../audit/constants/audit.constants';
import { AuditService } from '../../audit/audit.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { Role } from '../../common/constants/roles.constant';
import { OwnershipResolver } from '../../common/decorators/ownership.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
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
  private async runValidations(input: BookingInput, currentUser: AuthenticatedUser) {
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

    // Límite de 5 para COLLABORATOR (H-04)
    if (currentUser.role !== Role.ADMIN) {
      const activeFuture = await this.countActiveFutureBookings(currentUser.id);
      if (activeFuture >= MAX_FUTURE_ACTIVE_BOOKINGS) {
        throw new ConflictException(LIMIT_MESSAGE);
      }
    }

    // Solapamiento a nivel aplicación (RN-045..RN-052). Consecutivas permitidas.
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

    return { space, start, end };
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
    const { start, end } = await this.runValidations(dto, currentUser);

    let booking;
    try {
      booking = await this.bookingsRepository.create({
        bookingDate: toDateOnly(dto.date),
        startTime: toTimeOnly(start),
        endTime: toTimeOnly(end),
        attendeesCount: dto.attendeesCount,
        purpose: dto.purpose,
        status: BookingStatus.CONFIRMED,
        user: { connect: { id: currentUser.id } },
        creator: { connect: { id: currentUser.id } }, // H-09: created_by
        space: { connect: { id: dto.spaceId } },
      });
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
      newValues: { spaceId: dto.spaceId, date: dto.date, start, end },
      ipAddress,
    });

    // Notificación interna (H-07): reserva creada → al propietario.
    await this.notificationsService.notifyBookingCreated(
      currentUser.id,
      booking.space?.name ?? 'Espacio',
      dto.date,
      start,
    );

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
}

import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

export interface FindBookingsQuery {
  date?: Date;
  status?: BookingStatus;
  spaceId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

const includeRefs = {
  space: true,
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.BookingInclude;

@Injectable()
export class BookingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSpaceById(id: string) {
    return this.prisma.space.findUnique({ where: { id } });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: Prisma.BookingCreateInput) {
    return this.prisma.booking.create({ data, include: includeRefs });
  }

  findById(id: string) {
    return this.prisma.booking.findUnique({ where: { id }, include: includeRefs });
  }

  updateStatus(id: string, status: BookingStatus) {
    return this.prisma.booking.update({ where: { id }, data: { status }, include: includeRefs });
  }

  /** Reservas CONFIRMED del mismo espacio y fecha (para chequeo de solapamiento en app). */
  findConfirmedBySpaceAndDate(spaceId: string, date: Date) {
    return this.prisma.booking.findMany({
      where: { spaceId, bookingDate: date, status: BookingStatus.CONFIRMED },
    });
  }

  /** Todas las reservas CONFIRMED (para la cola de verificación de asistencia). */
  findAllConfirmed() {
    return this.prisma.booking.findMany({
      where: { status: BookingStatus.CONFIRMED },
      include: includeRefs,
      orderBy: [{ bookingDate: 'asc' }, { startTime: 'asc' }],
    });
  }

  /** Solicitudes recurrentes pendientes de aprobación (PENDING_APPROVAL). */
  findAllPending() {
    return this.prisma.booking.findMany({
      where: { status: BookingStatus.PENDING_APPROVAL },
      include: includeRefs,
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Candidatas para el límite: CONFIRMED de un usuario desde una fecha (inclusive). */
  findConfirmedByUserFrom(userId: string, fromDate: Date) {
    return this.prisma.booking.findMany({
      where: { userId, status: BookingStatus.CONFIRMED, bookingDate: { gte: fromDate } },
    });
  }

  async findMany(query: FindBookingsQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const where: Prisma.BookingWhereInput = {
      ...(query.date ? { bookingDate: query.date } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.spaceId ? { spaceId: query.spaceId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: includeRefs,
        orderBy: [{ bookingDate: 'desc' }, { startTime: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}

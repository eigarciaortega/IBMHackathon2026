import { Injectable } from '@nestjs/common';
import { BookingStatus, SpaceStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

/**
 * DashboardRepository — solo lecturas/agregaciones para métricas (on-demand).
 * No persiste métricas (decisión: cálculo en tiempo de consulta).
 */
@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Espacios ----
  countSpaces(status?: SpaceStatus) {
    return this.prisma.space.count({ where: status ? { status } : {} });
  }

  findSpacesBasic() {
    return this.prisma.space.findMany({
      select: { id: true, name: true, spaceType: true, status: true },
    });
  }

  // ---- Reservas (conteos) ----
  countBookingsOnDate(date: Date) {
    return this.prisma.booking.count({
      where: { bookingDate: date, status: { not: BookingStatus.CANCELLED } },
    });
  }

  countBookingsInRange(from: Date, to: Date) {
    return this.prisma.booking.count({
      where: {
        bookingDate: { gte: from, lte: to },
        status: { not: BookingStatus.CANCELLED },
      },
    });
  }

  countByStatus(status: BookingStatus) {
    return this.prisma.booking.count({ where: { status } });
  }

  countAllBookings() {
    return this.prisma.booking.count();
  }

  /** Reservas no canceladas, con datos mínimos para topSpaces/peakHours/tipo. */
  findNonCancelledForMetrics() {
    return this.prisma.booking.findMany({
      where: { status: { not: BookingStatus.CANCELLED } },
      select: {
        spaceId: true,
        bookingDate: true,
        startTime: true,
        status: true,
        space: { select: { name: true, spaceType: true } },
      },
    });
  }

  // ---- Colaborador ----
  findUserConfirmedFrom(userId: string, from: Date) {
    return this.prisma.booking.findMany({
      where: { userId, status: BookingStatus.CONFIRMED, bookingDate: { gte: from } },
      include: { space: { select: { id: true, name: true, spaceType: true } } },
      orderBy: [{ bookingDate: 'asc' }, { startTime: 'asc' }],
    });
  }
}

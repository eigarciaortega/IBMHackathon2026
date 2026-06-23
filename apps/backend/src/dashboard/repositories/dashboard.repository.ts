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

  /** Espacios con datos para el "estado de salas ahora". */
  findSpacesForStatus() {
    return this.prisma.space.findMany({
      select: { id: true, name: true, capacity: true, status: true },
      orderBy: { name: 'asc' },
    });
  }

  /** Reservas CONFIRMED de una fecha (timeline / estado de salas / ocupación hoy). */
  findConfirmedOnDate(date: Date) {
    return this.prisma.booking.findMany({
      where: { bookingDate: date, status: BookingStatus.CONFIRMED },
      select: {
        spaceId: true,
        startTime: true,
        endTime: true,
        status: true,
        space: { select: { name: true } },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /** Reservas no canceladas en un rango (semana/mes), con espacio para uso. */
  findNonCancelledInRange(from: Date, to: Date) {
    return this.prisma.booking.findMany({
      where: { bookingDate: { gte: from, lte: to }, status: { not: BookingStatus.CANCELLED } },
      select: {
        spaceId: true,
        bookingDate: true,
        startTime: true,
        status: true,
        space: { select: { name: true } },
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

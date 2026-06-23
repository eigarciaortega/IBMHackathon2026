import { Injectable } from '@nestjs/common';
import { BookingStatus, SpaceStatus } from '@prisma/client';
import { formatDate, formatTime, isPast, nowInOfficeTz, toDateOnly } from '../../bookings/utils/time.util';
import {
  AdminDashboardResponseDto,
  AnalyticsResponseDto,
  CollaboratorDashboardResponseDto,
  PeakHourDto,
  TopSpaceDto,
} from '../dto/dashboard-response.dto';
import { DashboardRepository } from '../repositories/dashboard.repository';

type MetricBooking = {
  spaceId: string;
  bookingDate: Date;
  startTime: Date;
  status: BookingStatus;
  space: { name: string; spaceType: string };
};

/**
 * DashboardService — métricas calculadas ON-DEMAND (sin streaming ni WebSockets).
 *
 * Definiciones oficiales (aprobadas):
 *  - occupancyRate    = % de espacios operativos (AVAILABLE+MAINTENANCE) con al
 *                       menos una reserva activa hoy.
 *  - cancelledBookings= total histórico de reservas CANCELLED.
 *  - noShows          = total histórico de reservas NO_SHOW.
 *  - upcomingBookings = solo CONFIRMED efectivamente futuras (excluye FINISHED
 *                       derivado, H-02).
 *  Zona horaria oficial: America/Mexico_City (T-03).
 */
@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  // ---- Helpers ----
  private computeWeekRange(todayStr: string): { from: Date; to: Date } {
    const base = new Date(`${todayStr}T00:00:00.000Z`);
    const dow = base.getUTCDay(); // 0=domingo
    const daysSinceMonday = (dow + 6) % 7;
    const monday = new Date(base);
    monday.setUTCDate(base.getUTCDate() - daysSinceMonday);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return { from: monday, to: sunday };
  }

  private topSpacesFrom(metrics: MetricBooking[], order: 'desc' | 'asc', take: number): TopSpaceDto[] {
    const map = new Map<string, { name: string; count: number }>();
    for (const b of metrics) {
      const entry = map.get(b.spaceId) ?? { name: b.space.name, count: 0 };
      entry.count += 1;
      map.set(b.spaceId, entry);
    }
    const list: TopSpaceDto[] = [...map.entries()].map(([spaceId, v]) => ({
      spaceId,
      name: v.name,
      count: v.count,
    }));
    list.sort((a, b) => (order === 'desc' ? b.count - a.count : a.count - b.count));
    return list.slice(0, take);
  }

  private peakHoursFrom(metrics: MetricBooking[], take?: number): PeakHourDto[] {
    const counts = new Map<number, number>();
    for (const b of metrics) {
      const hour = Number(formatTime(b.startTime).slice(0, 2));
      counts.set(hour, (counts.get(hour) ?? 0) + 1);
    }
    const list: PeakHourDto[] = [...counts.entries()].map(([hour, count]) => ({ hour, count }));
    list.sort((a, b) => b.count - a.count);
    return take ? list.slice(0, take) : list;
  }

  private occupancyToday(metrics: MetricBooking[], today: string, operationalSpaces: number): number {
    if (operationalSpaces <= 0) return 0;
    const spacesToday = new Set(
      metrics.filter((b) => formatDate(b.bookingDate) === today).map((b) => b.spaceId),
    );
    return Math.round((spacesToday.size / operationalSpaces) * 100);
  }

  // ---- Admin ----
  async getAdminDashboard(): Promise<AdminDashboardResponseDto> {
    const today = nowInOfficeTz().date;
    const { from, to } = this.computeWeekRange(today);

    const [totalSpaces, availableSpaces, maintenanceSpaces] = await Promise.all([
      this.dashboardRepository.countSpaces(),
      this.dashboardRepository.countSpaces(SpaceStatus.AVAILABLE),
      this.dashboardRepository.countSpaces(SpaceStatus.MAINTENANCE),
    ]);

    const [todayBookings, weeklyBookings, cancelledBookings, noShows, confirmedBookings, verifiedAttendance, metrics] =
      await Promise.all([
        this.dashboardRepository.countBookingsOnDate(toDateOnly(today)),
        this.dashboardRepository.countBookingsInRange(from, to),
        this.dashboardRepository.countByStatus(BookingStatus.CANCELLED),
        this.dashboardRepository.countByStatus(BookingStatus.NO_SHOW),
        this.dashboardRepository.countByStatus(BookingStatus.CONFIRMED),
        this.dashboardRepository.countByStatus(BookingStatus.ATTENDED),
        this.dashboardRepository.findNonCancelledForMetrics() as Promise<MetricBooking[]>,
      ]);

    const operationalSpaces = availableSpaces + maintenanceSpaces;
    const verificationTotal = verifiedAttendance + noShows;
    const attendanceRate = verificationTotal ? Math.round((verifiedAttendance / verificationTotal) * 100) : 0;

    return {
      totalSpaces,
      availableSpaces,
      maintenanceSpaces,
      todayBookings,
      weeklyBookings,
      cancelledBookings,
      noShows,
      topSpaces: this.topSpacesFrom(metrics, 'desc', 5),
      peakHours: this.peakHoursFrom(metrics, 5),
      occupancyRate: this.occupancyToday(metrics, today, operationalSpaces),
      confirmedBookings,
      verifiedAttendance,
      attendanceRate,
    };
  }

  // ---- Analytics ----
  async getAnalytics(): Promise<AnalyticsResponseDto> {
    const today = nowInOfficeTz().date;

    const [totalBookings, cancelled, noShows, metrics, spaces, availableSpaces, maintenanceSpaces] =
      await Promise.all([
        this.dashboardRepository.countAllBookings(),
        this.dashboardRepository.countByStatus(BookingStatus.CANCELLED),
        this.dashboardRepository.countByStatus(BookingStatus.NO_SHOW),
        this.dashboardRepository.findNonCancelledForMetrics() as Promise<MetricBooking[]>,
        this.dashboardRepository.findSpacesBasic(),
        this.dashboardRepository.countSpaces(SpaceStatus.AVAILABLE),
        this.dashboardRepository.countSpaces(SpaceStatus.MAINTENANCE),
      ]);

    // Uso por espacio incluyendo los que tienen 0 reservas
    const usage = new Map<string, number>();
    for (const b of metrics) usage.set(b.spaceId, (usage.get(b.spaceId) ?? 0) + 1);
    const perSpace: TopSpaceDto[] = spaces.map((s) => ({
      spaceId: s.id,
      name: s.name,
      count: usage.get(s.id) ?? 0,
    }));
    const topSpaces = [...perSpace].sort((a, b) => b.count - a.count).slice(0, 5);
    const leastSpaces = [...perSpace].sort((a, b) => a.count - b.count).slice(0, 5);

    // Distribución por tipo
    const byType = new Map<string, number>();
    for (const b of metrics) byType.set(b.space.spaceType, (byType.get(b.space.spaceType) ?? 0) + 1);
    const bookingsByType = [...byType.entries()].map(([spaceType, count]) => ({ spaceType, count }));

    // Reservas por día (últimos 7 días)
    const bookingsPerDay = [];
    const base = new Date(`${today}T00:00:00.000Z`);
    for (let i = 6; i >= 0; i--) {
      const day = new Date(base);
      day.setUTCDate(base.getUTCDate() - i);
      const dStr = day.toISOString().slice(0, 10);
      const count = metrics.filter((b) => formatDate(b.bookingDate) === dStr).length;
      bookingsPerDay.push({ date: dStr, count });
    }

    const operationalSpaces = availableSpaces + maintenanceSpaces;

    return {
      totalBookings,
      topSpaces,
      leastSpaces,
      peakHours: this.peakHoursFrom(metrics),
      occupancyRate: this.occupancyToday(metrics, today, operationalSpaces),
      cancellationRate: totalBookings ? Math.round((cancelled / totalBookings) * 100) : 0,
      noShowRate: totalBookings ? Math.round((noShows / totalBookings) * 100) : 0,
      bookingsByType,
      bookingsPerDay,
    };
  }

  // ---- Colaborador ----
  async getCollaboratorDashboard(userId: string): Promise<CollaboratorDashboardResponseDto> {
    const today = nowInOfficeTz().date;
    const confirmed = await this.dashboardRepository.findUserConfirmedFrom(userId, toDateOnly(today));

    const upcomingBookings = confirmed
      // FINISHED derivado (H-02): excluir las ya finalizadas
      .filter((b) => !isPast(formatDate(b.bookingDate), formatTime(b.endTime)))
      .map((b) => ({
        id: b.id,
        spaceId: b.spaceId,
        spaceName: b.space.name,
        date: formatDate(b.bookingDate),
        startTime: formatTime(b.startTime),
        endTime: formatTime(b.endTime),
      }));

    const availableSpaces = await this.dashboardRepository.countSpaces(SpaceStatus.AVAILABLE);

    return { upcomingBookings, availableSpaces };
  }

  // ---- Ocupación (centro de control) ----
  async getOccupancy() {
    const now = nowInOfficeTz();
    const today = now.date;
    const nowT = now.time; // HH:MM:SS
    const r2 = (n: number) => Math.round(n);

    const [spaces, confirmedToday] = await Promise.all([
      this.dashboardRepository.findSpacesForStatus(),
      this.dashboardRepository.findConfirmedOnDate(toDateOnly(today)),
    ]);
    const totalSpaces = spaces.length;
    const operational = spaces.filter((s) => s.status !== 'INACTIVE').length;

    const fullName = (u?: { firstName: string; lastName: string } | null) =>
      u ? `${u.firstName} ${u.lastName}`.trim() : '—';

    // Estado de salas AHORA + timeline del día
    const todayBySpace = new Map<string, typeof confirmedToday>();
    for (const b of confirmedToday) {
      const arr = todayBySpace.get(b.spaceId) ?? [];
      arr.push(b);
      todayBySpace.set(b.spaceId, arr);
    }

    const spaceOccupancyStatus = spaces.map((s) => {
      const evts = (todayBySpace.get(s.id) ?? []).slice().sort((a, b) =>
        formatTime(a.startTime).localeCompare(formatTime(b.startTime)),
      );
      if (s.status === 'MAINTENANCE') {
        return { spaceId: s.id, spaceName: s.name, capacity: s.capacity, status: 'maintenance', currentBooking: null, nextAvailableAt: null, nextBookingAt: null };
      }
      if (s.status === 'INACTIVE') {
        return { spaceId: s.id, spaceName: s.name, capacity: s.capacity, status: 'inactive', currentBooking: null, nextAvailableAt: null, nextBookingAt: null };
      }
      const current = evts.find((e) => formatTime(e.startTime) <= nowT && formatTime(e.endTime) > nowT);
      if (current) {
        return {
          spaceId: s.id,
          spaceName: s.name,
          capacity: s.capacity,
          status: 'occupied',
          currentBooking: {
            startTime: formatTime(current.startTime).slice(0, 5),
            endTime: formatTime(current.endTime).slice(0, 5),
            userName: fullName(current.user),
          },
          nextAvailableAt: formatTime(current.endTime).slice(0, 5),
          nextBookingAt: null,
        };
      }
      const next = evts.find((e) => formatTime(e.startTime) > nowT);
      return {
        spaceId: s.id,
        spaceName: s.name,
        capacity: s.capacity,
        status: 'available',
        currentBooking: null,
        nextAvailableAt: null,
        nextBookingAt: next ? formatTime(next.startTime).slice(0, 5) : null,
      };
    });

    const occupiedNow = spaceOccupancyStatus.filter((s) => s.status === 'occupied').length;
    const spacesWithBookingToday = new Set(confirmedToday.map((b) => b.spaceId)).size;

    const todayTimeline = spaces
      .map((s) => ({
        spaceId: s.id,
        spaceName: s.name,
        events: (todayBySpace.get(s.id) ?? [])
          .slice()
          .sort((a, b) => formatTime(a.startTime).localeCompare(formatTime(b.startTime)))
          .map((e) => ({
            startTime: formatTime(e.startTime).slice(0, 5),
            endTime: formatTime(e.endTime).slice(0, 5),
            status: e.status,
            userName: fullName(e.user),
          })),
      }))
      .filter((row) => row.events.length > 0);

    // Semana (Lun–Dom)
    const { from: weekFrom, to: weekTo } = this.computeWeekRange(today);
    const weekBookings = await this.dashboardRepository.findNonCancelledInRange(weekFrom, weekTo);
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const dailyBreakdown = dayNames.map((day, i) => {
      const d = new Date(weekFrom);
      d.setUTCDate(weekFrom.getUTCDate() + i);
      const dStr = d.toISOString().slice(0, 10);
      const dayB = weekBookings.filter((b) => formatDate(b.bookingDate) === dStr);
      const distinct = new Set(dayB.map((b) => b.spaceId)).size;
      return { day, bookings: dayB.length, occupancyRate: operational ? r2((distinct / operational) * 100) : 0 };
    });
    const weeklyOccupancyRate = dailyBreakdown.length
      ? r2(dailyBreakdown.reduce((a, b) => a + b.occupancyRate, 0) / dailyBreakdown.length)
      : 0;

    // Mes actual
    const base = new Date(`${today}T00:00:00.000Z`);
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth();
    const monthFrom = new Date(Date.UTC(y, m, 1));
    const monthTo = new Date(Date.UTC(y, m + 1, 0));
    const daysInMonth = monthTo.getUTCDate();
    const monthBookings = await this.dashboardRepository.findNonCancelledInRange(monthFrom, monthTo);
    const monthSpaceDays = new Set(monthBookings.map((b) => `${b.spaceId}|${formatDate(b.bookingDate)}`)).size;
    const monthlyOccupancyRate = operational ? r2((monthSpaceDays / (operational * daysInMonth)) * 100) : 0;

    // Horas pico (del mes)
    const hourMap = new Map<string, number>();
    for (const b of monthBookings) {
      const hh = `${formatTime(b.startTime).slice(0, 2)}:00`;
      hourMap.set(hh, (hourMap.get(hh) ?? 0) + 1);
    }
    const peakHours = [...hourMap.entries()]
      .map(([hour, bookings]) => ({ hour, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10);

    // Salas más usadas (del mes)
    const useMap = new Map<string, { name: string; count: number }>();
    for (const b of monthBookings) {
      const e = useMap.get(b.spaceId) ?? { name: b.space.name, count: 0 };
      e.count += 1;
      useMap.set(b.spaceId, e);
    }
    const maxUse = Math.max(1, ...[...useMap.values()].map((v) => v.count));
    const mostUsedSpaces = [...useMap.entries()]
      .map(([spaceId, v]) => ({ spaceId, spaceName: v.name, bookings: v.count, occupancyRate: r2((v.count / maxUse) * 100) }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 6);

    return {
      today: {
        occupiedSpaces: occupiedNow,
        availableSpaces: Math.max(0, operational - occupiedNow),
        totalSpaces,
        occupancyRate: operational ? r2((spacesWithBookingToday / operational) * 100) : 0,
        bookingsCount: confirmedToday.length,
      },
      week: {
        bookingsCount: weekBookings.length,
        occupancyRate: weeklyOccupancyRate,
        dailyBreakdown,
      },
      month: {
        bookingsCount: monthBookings.length,
        occupancyRate: monthlyOccupancyRate,
      },
      peakHours,
      mostUsedSpaces,
      todayTimeline,
      spaceOccupancyStatus,
    };
  }
}

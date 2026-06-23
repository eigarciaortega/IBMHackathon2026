import { ApiProperty } from '@nestjs/swagger';

export class TopSpaceDto {
  @ApiProperty() spaceId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() count!: number;
}

export class PeakHourDto {
  @ApiProperty({ description: 'Hora 0-23' }) hour!: number;
  @ApiProperty() count!: number;
}

/** Respuesta de GET /dashboard/admin. */
export class AdminDashboardResponseDto {
  @ApiProperty() totalSpaces!: number;
  @ApiProperty() availableSpaces!: number;
  @ApiProperty() maintenanceSpaces!: number;
  @ApiProperty() todayBookings!: number;
  @ApiProperty() weeklyBookings!: number;
  @ApiProperty() cancelledBookings!: number;
  @ApiProperty() noShows!: number;
  @ApiProperty({ type: [TopSpaceDto] }) topSpaces!: TopSpaceDto[];
  @ApiProperty({ type: [PeakHourDto] }) peakHours!: PeakHourDto[];
  @ApiProperty({ description: '% de espacios operativos ocupados hoy (0-100)' })
  occupancyRate!: number;

  // ---- Control de Asistencia ----
  @ApiProperty({ description: 'Reservas confirmadas (estado CONFIRMED en BD)' })
  confirmedBookings!: number;
  @ApiProperty({ description: 'Asistencias verificadas (estado ATTENDED)' })
  verifiedAttendance!: number;
  @ApiProperty({ description: '% de asistencia = ATTENDED / (ATTENDED + NO_SHOW)' })
  attendanceRate!: number;
}

export class TypeDistributionDto {
  @ApiProperty() spaceType!: string;
  @ApiProperty() count!: number;
}

export class DailyCountDto {
  @ApiProperty({ description: 'YYYY-MM-DD' }) date!: string;
  @ApiProperty() count!: number;
}

/** Respuesta de GET /dashboard/admin/analytics. */
export class AnalyticsResponseDto {
  @ApiProperty() totalBookings!: number;
  @ApiProperty({ type: [TopSpaceDto] }) topSpaces!: TopSpaceDto[];
  @ApiProperty({ type: [TopSpaceDto] }) leastSpaces!: TopSpaceDto[];
  @ApiProperty({ type: [PeakHourDto] }) peakHours!: PeakHourDto[];
  @ApiProperty() occupancyRate!: number;
  @ApiProperty({ description: '% de reservas canceladas (0-100)' }) cancellationRate!: number;
  @ApiProperty({ description: '% de NO_SHOW (0-100)' }) noShowRate!: number;
  @ApiProperty({ type: [TypeDistributionDto] }) bookingsByType!: TypeDistributionDto[];
  @ApiProperty({ type: [DailyCountDto], description: 'Últimos 7 días' })
  bookingsPerDay!: DailyCountDto[];
}

export class UpcomingBookingDto {
  @ApiProperty() id!: string;
  @ApiProperty() spaceId!: string;
  @ApiProperty() spaceName!: string;
  @ApiProperty() date!: string;
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
}

/** Respuesta de GET /dashboard/collaborator. */
export class CollaboratorDashboardResponseDto {
  @ApiProperty({ type: [UpcomingBookingDto] }) upcomingBookings!: UpcomingBookingDto[];
  @ApiProperty({ description: 'Cantidad de espacios disponibles (AVAILABLE)' })
  availableSpaces!: number;
}

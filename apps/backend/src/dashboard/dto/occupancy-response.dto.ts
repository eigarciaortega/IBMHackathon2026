import { ApiProperty } from '@nestjs/swagger';

class TodayBlock {
  @ApiProperty() occupiedSpaces!: number;
  @ApiProperty() availableSpaces!: number;
  @ApiProperty() totalSpaces!: number;
  @ApiProperty() occupancyRate!: number;
  @ApiProperty() bookingsCount!: number;
}
class DailyBreakdown {
  @ApiProperty() day!: string;
  @ApiProperty() bookings!: number;
  @ApiProperty() occupancyRate!: number;
}
class WeekBlock {
  @ApiProperty() bookingsCount!: number;
  @ApiProperty() occupancyRate!: number;
  @ApiProperty({ type: [DailyBreakdown] }) dailyBreakdown!: DailyBreakdown[];
}
class MonthBlock {
  @ApiProperty() bookingsCount!: number;
  @ApiProperty() occupancyRate!: number;
}
class PeakHour {
  @ApiProperty() hour!: string;
  @ApiProperty() bookings!: number;
}
class MostUsedSpace {
  @ApiProperty() spaceId!: string;
  @ApiProperty() spaceName!: string;
  @ApiProperty() bookings!: number;
  @ApiProperty() occupancyRate!: number;
}
class TimelineEvent {
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() status!: string;
  @ApiProperty() userName!: string;
}
class TimelineRow {
  @ApiProperty() spaceId!: string;
  @ApiProperty() spaceName!: string;
  @ApiProperty({ type: [TimelineEvent] }) events!: TimelineEvent[];
}
class CurrentBooking {
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() userName!: string;
}
class SpaceStatusRow {
  @ApiProperty() spaceId!: string;
  @ApiProperty() spaceName!: string;
  @ApiProperty() capacity!: number;
  @ApiProperty({ enum: ['available', 'occupied', 'maintenance', 'inactive'] })
  status!: string;
  @ApiProperty({ required: false, type: CurrentBooking, nullable: true })
  currentBooking!: CurrentBooking | null;
  @ApiProperty({ required: false, nullable: true })
  nextAvailableAt!: string | null;
  @ApiProperty({ required: false, nullable: true })
  nextBookingAt!: string | null;
}

export class OccupancyResponseDto {
  @ApiProperty({ type: TodayBlock }) today!: TodayBlock;
  @ApiProperty({ type: WeekBlock }) week!: WeekBlock;
  @ApiProperty({ type: MonthBlock }) month!: MonthBlock;
  @ApiProperty({ type: [PeakHour] }) peakHours!: PeakHour[];
  @ApiProperty({ type: [MostUsedSpace] }) mostUsedSpaces!: MostUsedSpace[];
  @ApiProperty({ type: [TimelineRow] }) todayTimeline!: TimelineRow[];
  @ApiProperty({ type: [SpaceStatusRow] }) spaceOccupancyStatus!: SpaceStatusRow[];
}

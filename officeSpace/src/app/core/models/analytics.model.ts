export interface SpaceUsage {
  spacePublicId: string;
  bookingCount: number;
}

export interface PeakHour {
  startTime: string;
  bookingCount: number;
}

export interface DailyStats {
  date: string;
  bookingCount: number;
}

export interface AnalyticsDashboard {
  totalBookings: number;
  activeBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  cancellationRate: number;
  spaceUsage: SpaceUsage[];
  peakHours: PeakHour[];
  bookingsPerDay: DailyStats[];
}

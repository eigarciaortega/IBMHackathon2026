export type BookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface Booking {
  id: number;
  spaceId: number;
  spaceName: string;
  userId: number;
  userName: string;
  date: string;       // ISO date yyyy-MM-dd
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  attendees: number;
  status: BookingStatus;
  createdAt: string;
}

export interface BookingCreateRequest {
  spaceId: number;
  date: string;
  startTime: string;
  endTime: string;
  attendees: number;
}

export interface DashboardStats {
  totalSpaces: number;
  occupiedToday: number;
  availableToday: number;
  bookingsToday: number;
  occupancyRate: number;
}

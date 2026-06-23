export type BookingStatus = 'CONFIRMED' | 'CHECKED_IN' | 'NO_SHOW' | 'CANCELLED';

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
  checkedInAt: string | null;
  createdAt: string;
}

export interface BookingCreateRequest {
  spaceId: number;
  date: string;
  startTime: string;
  endTime: string;
  attendees: number;
}

export interface BookingSuggestion {
  spaceId: number;
  spaceName: string;
  spaceType: string;
  date: string;
  startTime: string;
  endTime: string;
  label: string;
  reason: string;
}

export interface DashboardStats {
  totalSpaces: number;
  occupiedToday: number;
  availableToday: number;
  bookingsToday: number;
  occupancyRate: number;
}

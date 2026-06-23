export type BookingStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED';

export interface Booking {
  publicId: string;
  spacePublicId: string;
  userName?: string;
  userEmail?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  attendees: number;
  notes?: string;
  status: BookingStatus;
  cancelledAt?: string;
  createdAt: string;
}

export interface BookingRequest {
  spacePublicId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  attendees: number;
  notes?: string;
}

export interface CalendarLinks {
  googleCalendarUrl: string;
  outlookUrl: string;
}

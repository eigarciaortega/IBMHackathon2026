// Tipos y enums compartidos del frontend (espejo del backend).

export type RoleName = 'ADMIN' | 'COLLABORATOR';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type SpaceStatus = 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE';
export type ResourceStatus = 'ACTIVE' | 'INACTIVE';
export type BookingStatus =
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'FINISHED'
  | 'NO_SHOW'
  | 'ATTENDED'
  | 'PENDING_APPROVAL';

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: RoleName;
  status: UserStatus;
}

export interface LoginResponse {
  token: string;
  mustChangePassword: boolean;
  user: AuthUser;
}

export interface Resource {
  id: string;
  name: string;
  description?: string | null;
  status: ResourceStatus;
}

export interface Space {
  id: string;
  name: string;
  spaceType: string;
  capacity: number;
  floor: string;
  zone: string;
  description?: string | null;
  status: SpaceStatus;
  spaceResources?: { resource: Resource }[];
}

export interface Booking {
  id: string;
  userId: string;
  spaceId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
  purpose: string;
  status: BookingStatus;
  space?: Space;
  user?: { id: string; firstName: string; lastName: string; email: string };
}

export interface UserRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: UserStatus;
  role: { name: RoleName };
  lastLogin?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  success: boolean;
  ipAddress?: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  unread?: number;
}

export interface AdminDashboard {
  totalSpaces: number;
  availableSpaces: number;
  maintenanceSpaces: number;
  todayBookings: number;
  weeklyBookings: number;
  cancelledBookings: number;
  noShows: number;
  topSpaces: { spaceId: string; name: string; count: number }[];
  peakHours: { hour: number; count: number }[];
  occupancyRate: number;
  confirmedBookings: number;
  verifiedAttendance: number;
  attendanceRate: number;
}

export interface CollaboratorDashboard {
  upcomingBookings: {
    id: string;
    spaceId: string;
    spaceName: string;
    date: string;
    startTime: string;
    endTime: string;
  }[];
  availableSpaces: number;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
}

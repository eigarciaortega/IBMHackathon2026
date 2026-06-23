import { authApi, bookingApi, catalogApi } from '../lib/api';
import {
  AdminDashboard,
  AuditLog,
  Booking,
  CollaboratorDashboard,
  Faq,
  AssistantReply,
  NotificationItem,
  Occupancy,
  Paginated,
  Resource,
  Space,
  UserRecord,
} from '../types';

// ===== auth-service (3001): /auth, /users, /audit =====
export const authService = {
  changePassword: (currentPassword: string, newPassword: string) =>
    authApi.patch('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
};

export const usersService = {
  list: (params?: Record<string, unknown>) =>
    authApi.get<Paginated<UserRecord>>('/users', { params }).then((r) => r.data),
  create: (body: unknown) =>
    authApi.post<{ user: UserRecord; temporaryPassword: string }>('/users', body).then((r) => r.data),
  changeStatus: (id: string, status: string) =>
    authApi.patch(`/users/${id}/status`, { status }).then((r) => r.data),
  remove: (id: string) => authApi.delete(`/users/${id}`).then((r) => r.data),
};

export const auditService = {
  list: (params?: Record<string, unknown>) =>
    authApi.get<Paginated<AuditLog>>('/audit', { params }).then((r) => r.data),
};

// ===== catalog-service (3002): /spaces, /resources, /chatbot =====
export const spacesService = {
  list: (params?: Record<string, unknown>) =>
    catalogApi.get<Paginated<Space>>('/spaces', { params }).then((r) => r.data),
  get: (id: string) => catalogApi.get<Space>(`/spaces/${id}`).then((r) => r.data),
  create: (body: unknown) => catalogApi.post<Space>('/spaces', body).then((r) => r.data),
  update: (id: string, body: unknown) => catalogApi.put<Space>(`/spaces/${id}`, body).then((r) => r.data),
  changeStatus: (id: string, status: string) =>
    catalogApi.patch(`/spaces/${id}/status`, { status }).then((r) => r.data),
  remove: (id: string) => catalogApi.delete(`/spaces/${id}`).then((r) => r.data),
};

export const resourcesService = {
  list: (params?: Record<string, unknown>) =>
    catalogApi.get<Paginated<Resource>>('/resources', { params }).then((r) => r.data),
  create: (body: unknown) => catalogApi.post<Resource>('/resources', body).then((r) => r.data),
  update: (id: string, body: unknown) => catalogApi.put<Resource>(`/resources/${id}`, body).then((r) => r.data),
  remove: (id: string) => catalogApi.delete(`/resources/${id}`).then((r) => r.data),
};

export const chatbotService = {
  listFaq: (params?: Record<string, unknown>) =>
    catalogApi.get<Paginated<Faq>>('/chatbot/faq', { params }).then((r) => r.data),
  ask: (question: string) =>
    catalogApi
      .post<{
        matched: boolean;
        results?: Faq[];
        message?: string;
        categories?: string[];
        suggestions?: { id: string; question: string; category: string }[];
      }>('/chatbot/ask', { question })
      .then((r) => r.data),
  assistant: (message: string, context?: { role?: string; currentPage?: string }) =>
    catalogApi.post<AssistantReply>('/chatbot/assistant', { message, context }).then((r) => r.data),
};

// ===== booking-service (3003): /bookings, /dashboard, /notifications, /export =====
export const bookingsService = {
  list: (params?: Record<string, unknown>) =>
    bookingApi.get<Paginated<Booking>>('/bookings', { params }).then((r) => r.data),
  get: (id: string) => bookingApi.get<Booking>(`/bookings/${id}`).then((r) => r.data),
  create: (body: unknown) => bookingApi.post<Booking>('/bookings', body).then((r) => r.data),
  validate: (body: unknown) =>
    bookingApi.post<{ available: boolean; reason?: string }>('/bookings/validate', body).then((r) => r.data),
  myBookings: () => bookingApi.get<Booking[]>('/bookings/my-bookings').then((r) => r.data),
  upcoming: () => bookingApi.get<Booking[]>('/bookings/upcoming').then((r) => r.data),
  cancel: (id: string) => bookingApi.patch(`/bookings/${id}/cancel`).then((r) => r.data),
  noShow: (id: string) => bookingApi.patch(`/bookings/${id}/no-show`).then((r) => r.data),
  attended: (id: string) => bookingApi.patch(`/bookings/${id}/attended`).then((r) => r.data),
  toVerify: () => bookingApi.get<Booking[]>('/bookings/to-verify').then((r) => r.data),
  pending: () => bookingApi.get<Booking[]>('/bookings/pending').then((r) => r.data),
  availability: (spaceId: string, date: string, durationMinutes = 60) =>
    bookingApi
      .get<{ startTime: string; endTime: string; available: boolean }[]>('/bookings/availability', {
        params: { spaceId, date, durationMinutes },
      })
      .then((r) => r.data),
  approve: (id: string) => bookingApi.patch(`/bookings/${id}/approve`).then((r) => r.data),
  reject: (id: string) => bookingApi.patch(`/bookings/${id}/reject`).then((r) => r.data),
  release: (id: string) => bookingApi.patch(`/bookings/${id}/release`).then((r) => r.data),
  downloadIcs: async (id: string, label = 'reserva') => {
    const res = await bookingApi.get(`/bookings/${id}/calendar.ics`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${label}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const dashboardService = {
  admin: () => bookingApi.get<AdminDashboard>('/dashboard/admin').then((r) => r.data),
  occupancy: () => bookingApi.get<Occupancy>('/dashboard/admin/occupancy').then((r) => r.data),
  collaborator: () => bookingApi.get<CollaboratorDashboard>('/dashboard/collaborator').then((r) => r.data),
};

export const notificationsService = {
  list: (params?: Record<string, unknown>) =>
    bookingApi.get<Paginated<NotificationItem>>('/notifications', { params }).then((r) => r.data),
  markRead: (id: string) => bookingApi.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => bookingApi.patch('/notifications/read-all').then((r) => r.data),
};

export const exportService = {
  download: async (entity: 'bookings' | 'spaces' | 'users' | 'audit') => {
    // Todos los endpoints /export/* viven en booking-service (ExportModule).
    const res = await bookingApi.get(`/export/${entity}`, { params: { format: 'csv' }, responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

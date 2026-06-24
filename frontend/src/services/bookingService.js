import { API_URLS, apiRequest } from "./apiClient";

export function createBooking(booking) {
  return apiRequest(API_URLS.booking, "/bookings", {
    method: "POST",
    body: JSON.stringify(booking),
  });
}

export function getMyBookings() {
  return apiRequest(API_URLS.booking, "/bookings/my");
}

export function getMyDashboard() {
  return apiRequest(API_URLS.booking, "/bookings/my/dashboard");
}

export function cancelBooking(id) {
  return apiRequest(API_URLS.booking, `/bookings/${id}`, {
    method: "DELETE",
  });
}

export function getAllBookings() {
  return apiRequest(API_URLS.booking, "/bookings");
}

export function getAdminDashboard() {
  return apiRequest(API_URLS.booking, "/bookings/today/dashboard");
}
import { API_URLS, apiRequest } from "./apiClient";

export function login(email, password) {
  return apiRequest(API_URLS.auth, "/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });
}

export function getMe() {
  return apiRequest(API_URLS.auth, "/auth/me");
}
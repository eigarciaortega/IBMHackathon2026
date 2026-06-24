import { getToken } from "../utils/authStorage";

export const API_URLS = {
  auth: "http://localhost:8081",
  catalog: "http://localhost:8082",
  booking: "http://localhost:8083",
};

export async function apiRequest(baseUrl, endpoint, options = {}) {
  const token = getToken();
  const skipAuth = options.skipAuth === true;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token && !skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || "Ocurrió un error inesperado";
    throw new Error(message);
  }

  return data;
}
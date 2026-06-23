import axios, { AxiosInstance } from 'axios';

const TOKEN_KEY = 'officespace_token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const AUTH_URL = import.meta.env.VITE_AUTH_URL ?? 'http://localhost:3001/api/v1';
const CATALOG_URL = import.meta.env.VITE_CATALOG_URL ?? 'http://localhost:3002/api/v1';
const BOOKING_URL = import.meta.env.VITE_BOOKING_URL ?? 'http://localhost:3003/api/v1';

function createApi(baseURL: string): AxiosInstance {
  const instance = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });

  instance.interceptors.request.use((config) => {
    const token = tokenStorage.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    (error) => {
      if (error?.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
        tokenStorage.clear();
        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

// Una instancia por microservicio.
export const authApi = createApi(AUTH_URL);
export const catalogApi = createApi(CATALOG_URL);
export const bookingApi = createApi(BOOKING_URL);

// `api` apunta a auth-service (usado por AuthContext: login/logout/profile).
export const api = authApi;

export function getApiErrorMessage(error: unknown, fallback = 'Ocurrió un error.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    const msg = data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  }
  return fallback;
}

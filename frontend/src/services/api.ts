import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { ApiError } from '@/types/api.types';

// Get API URLs from runtime config or environment variables
const getAccountsURL = () => {
  if (typeof window !== 'undefined' && (window as any).APP_CONFIG) {
    return (window as any).APP_CONFIG.ACCOUNTS_API_URL;
  }
  return import.meta.env.VITE_ACCOUNTS_SERVICE_URL || 'http://localhost:3000';
};

const getProcessorURL = () => {
  if (typeof window !== 'undefined' && (window as any).APP_CONFIG) {
    return (window as any).APP_CONFIG.PROCESSOR_API_URL;
  }
  return import.meta.env.VITE_PROCESSOR_SERVICE_URL || 'http://localhost:3001';
};

const accountsAPI: AxiosInstance = axios.create({
  baseURL: getAccountsURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const processorAPI: AxiosInstance = axios.create({
  baseURL: getProcessorURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejo de errores
const errorInterceptor = (error: AxiosError<ApiError>) => {
  if (error.response) {
    // Error del servidor (4xx, 5xx)
    const apiError: ApiError = {
      error: error.response.data?.error || 'unknown_error',
      message: error.response.data?.message || 'An unexpected error occurred',
      statusCode: error.response.status,
    };
    return Promise.reject(apiError);
  } else if (error.request) {
    // Error de red
    const networkError: ApiError = {
      error: 'network_error',
      message: 'Unable to connect to the server. Please check if the backend services are running.',
      statusCode: 503,
    };
    return Promise.reject(networkError);
  }
  return Promise.reject(error);
};

accountsAPI.interceptors.response.use(
  (response) => response,
  errorInterceptor
);

processorAPI.interceptors.response.use(
  (response) => response,
  errorInterceptor
);

export { accountsAPI, processorAPI };

// Made with Bob

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface HealthCheck {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
}

// Made with Bob

export type UserRole = 'ADMINISTRADOR' | 'COLABORADOR';

export interface User {
  id: number;
  email: string;
  name?: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

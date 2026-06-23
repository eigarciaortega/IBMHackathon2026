import { RoleName } from '../constants/roles.constant';

/**
 * Forma del usuario autenticado adjuntado a la request por JwtStrategy.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: RoleName;
}

/**
 * Payload del JWT (decisión A-01 / S-01).
 */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: RoleName;
}

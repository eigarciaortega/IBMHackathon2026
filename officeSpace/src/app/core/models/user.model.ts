export type UserRole = 'ADMIN' | 'COLLABORATOR';

export interface User {
  token: string;
  tokenType: string;
  publicId: string;
  email: string;
  name: string;
  role: UserRole;
}

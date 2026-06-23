import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../constants/roles.constant';

export const ROLES_KEY = 'roles';

/**
 * @Roles(Role.ADMIN) — declara los roles permitidos para un endpoint.
 * Se evalúa con RolesGuard.
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

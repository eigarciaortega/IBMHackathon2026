import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { Role } from '../constants/roles.constant';
import {
  OwnershipResolver,
  OWNERSHIP_RESOLVER_KEY,
} from '../decorators/ownership.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * OwnershipGuard — anti-IDOR (decisión S-03).
 *
 * - ADMIN siempre pasa (RN-011/RN-012).
 * - Para el resto, resuelve el provider declarado con @CheckOwnership y llama
 *   isOwner(params.id, user.id). Si no es propietario → 403 Forbidden.
 * - Debe usarse después de JwtAuthGuard (necesita request.user).
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params: Record<string, string>;
    }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.role === Role.ADMIN) {
      return true;
    }

    const token = this.reflector.getAllAndOverride<unknown>(OWNERSHIP_RESOLVER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!token) {
      return true;
    }

    const resolver = this.moduleRef.get<OwnershipResolver>(token as never, { strict: false });
    const resourceId = request.params.id;
    const isOwner = await resolver.isOwner(resourceId, user.id);
    if (!isOwner) {
      throw new ForbiddenException('No tienes permisos sobre este recurso.');
    }
    return true;
  }
}

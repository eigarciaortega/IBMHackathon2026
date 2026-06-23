import { SetMetadata } from '@nestjs/common';

export const OWNERSHIP_RESOLVER_KEY = 'ownership_resolver';

/**
 * Contrato que debe implementar el servicio que resuelve la propiedad de un
 * recurso para el OwnershipGuard (decisión S-03).
 *
 * Convención: si el recurso NO existe, devolver `true` para que el servicio
 * destino responda 404 con su propio mensaje (en vez de un 403 ambiguo).
 */
export interface OwnershipResolver {
  isOwner(resourceId: string, userId: string): Promise<boolean>;
}

/**
 * @CheckOwnership(ServiceToken) — declara qué provider (que implementa
 * OwnershipResolver) usará el OwnershipGuard para validar la propiedad.
 */
export const CheckOwnership = (resolverToken: unknown) =>
  SetMetadata(OWNERSHIP_RESOLVER_KEY, resolverToken);

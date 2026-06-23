import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() — marca un endpoint como accesible sin JWT.
 * Única excepción prevista: POST /auth/login (doc 06 Swagger).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

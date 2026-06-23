import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../../backend/src/common/database/prisma.module';
import { AuditModule } from '../../backend/src/audit/audit.module';
import { AuthModule } from '../../backend/src/auth/auth.module';
import { UsersModule } from '../../backend/src/users/users.module';

/**
 * auth-service — microservicio de Autenticación, Usuarios y Auditoría.
 * BD compartida (mismo DATABASE_URL). Puerto 3001.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

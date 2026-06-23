import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/database/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SpacesModule } from './spaces/spaces.module';
import { ResourcesModule } from './resources/resources.module';
import { BookingsModule } from './bookings/bookings.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { ExportModule } from './export/export.module';

/**
 * AppModule — módulo raíz (Fase 5).
 *
 * Módulos activos (orden de construcción, decisión T-02):
 *   Prisma (infra) → Audit → Auth → Users → Spaces → Resources → Bookings →
 *   Dashboard → Notifications → Chatbot → Export
 *
 * Backend de dominio COMPLETO. Pendiente: Frontend y Docker final.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting global. El login aplica un límite estricto adicional
    // (5/15min por IP) mediante @Throttle (decisión S-02).
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
    ]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    SpacesModule,
    ResourcesModule,
    BookingsModule,
    DashboardModule,
    NotificationsModule,
    ChatbotModule,
    ExportModule,
  ],
  providers: [
    // Aplica el guard de throttling de forma global.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

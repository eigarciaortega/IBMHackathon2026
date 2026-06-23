import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../backend/src/common/database/prisma.module';
import { AuditCoreModule } from '../../backend/src/audit/audit-core.module';
import { JwtStrategy } from '../../backend/src/auth/strategies/jwt.strategy';
import { BookingsModule } from '../../backend/src/bookings/bookings.module';
import { DashboardModule } from '../../backend/src/dashboard/dashboard.module';
import { NotificationsModule } from '../../backend/src/notifications/notifications.module';
import { ExportModule } from '../../backend/src/export/export.module';

/**
 * booking-service — Reservas (anti-solapamiento), Dashboard, Notificaciones y
 * Exportaciones. BD compartida. Puerto 3003. Valida JWT con el mismo secret.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,
    PrismaModule,
    AuditCoreModule,
    NotificationsModule,
    BookingsModule,
    DashboardModule,
    ExportModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}

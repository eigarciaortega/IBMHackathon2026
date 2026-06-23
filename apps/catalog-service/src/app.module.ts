import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../backend/src/common/database/prisma.module';
import { AuditCoreModule } from '../../backend/src/audit/audit-core.module';
import { JwtStrategy } from '../../backend/src/auth/strategies/jwt.strategy';
import { SpacesModule } from '../../backend/src/spaces/spaces.module';
import { ResourcesModule } from '../../backend/src/resources/resources.module';
import { ChatbotModule } from '../../backend/src/chatbot/chatbot.module';

/**
 * catalog-service — Espacios, Recursos y Bot FAQ. BD compartida. Puerto 3002.
 * Valida JWT localmente con el mismo JWT_SECRET (JwtStrategy).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,
    PrismaModule,
    AuditCoreModule,
    SpacesModule,
    ResourcesModule,
    ChatbotModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}

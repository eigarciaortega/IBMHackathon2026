import { Global, Module } from '@nestjs/common';
import { AuditController } from './controllers/audit.controller';
import { AuditService } from './audit.service';
import { AuditRepository } from './repositories/audit.repository';

/**
 * AuditModule — transversal (decisión T-02: disponible desde el inicio).
 * Global para que cualquier módulo pueda inyectar AuditService.
 */
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AuditModule {}

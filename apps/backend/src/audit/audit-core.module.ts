import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditRepository } from './repositories/audit.repository';

/**
 * AuditCoreModule — provee AuditService SIN el controlador /audit.
 * Se usa en catalog-service y booking-service (auditoría mínima).
 * El endpoint de consulta /audit vive solo en auth-service (AuditModule completo).
 */
@Global()
@Module({
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AuditCoreModule {}

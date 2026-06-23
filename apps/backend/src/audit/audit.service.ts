import { Injectable, Logger } from '@nestjs/common';
import { AuditEvent } from './interfaces/audit-event.interface';
import { AuditQuery, AuditRepository } from './repositories/audit.repository';

/**
 * AuditService — registro central de eventos críticos (decisión C-04).
 *
 * Diseño: el registro NUNCA debe romper el flujo de negocio. Si la escritura
 * de auditoría falla, se loguea el error pero no se propaga la excepción.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditRepository: AuditRepository) {}

  async record(event: AuditEvent): Promise<void> {
    try {
      await this.auditRepository.create(event);
    } catch (error) {
      this.logger.error(
        `No se pudo registrar auditoría (${event.action}/${event.entityType})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  list(query: AuditQuery) {
    return this.auditRepository.findMany(query);
  }

  getById(id: string) {
    return this.auditRepository.findById(id);
  }
}

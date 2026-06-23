import { AuditActionType, AuditEntityType } from '../constants/audit.constants';

/**
 * Datos de un evento de auditoría a registrar.
 */
export interface AuditEvent {
  userId: string;
  action: AuditActionType;
  entityType: AuditEntityType;
  success: boolean;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

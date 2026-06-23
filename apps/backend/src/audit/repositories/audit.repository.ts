import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditEvent } from '../interfaces/audit-event.interface';

export interface AuditQuery {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * AuditRepository — acceso a datos de audit_logs.
 * Solo INSERT y SELECT: la tabla es inmutable por diseño (BD-05).
 */
@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(event: AuditEvent) {
    return this.prisma.auditLog.create({
      data: {
        userId: event.userId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId ?? null,
        oldValues: (event.oldValues ?? undefined) as Prisma.InputJsonValue | undefined,
        newValues: (event.newValues ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: event.ipAddress ?? null,
        success: event.success,
      },
    });
  }

  async findMany(query: AuditQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const where: Prisma.AuditLogWhereInput = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: query.startDate } : {}),
              ...(query.endDate ? { lte: query.endDate } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  findById(id: string) {
    return this.prisma.auditLog.findUnique({ where: { id } });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

/**
 * ExportRepository — lecturas para exportación. Selecciona EXPLÍCITAMENTE los
 * campos a exportar; nunca incluye passwordHash ni temporaryPassword.
 */
@Injectable()
export class ExportRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBookings() {
    return this.prisma.booking.findMany({
      orderBy: [{ bookingDate: 'desc' }, { startTime: 'desc' }],
      include: {
        user: { select: { email: true } },
        space: { select: { name: true } },
      },
    });
  }

  findSpaces() {
    return this.prisma.space.findMany({ orderBy: { name: 'asc' } });
  }

  findUsers() {
    // Selección explícita: SIN passwordHash ni temporaryPassword.
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        mustChangePassword: true,
        lastLogin: true,
        createdAt: true,
        role: { select: { name: true } },
      },
    });
  }

  findAudit() {
    // No se exportan old_values/new_values (pueden contener datos sensibles).
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        action: true,
        entityType: true,
        entityId: true,
        success: true,
        ipAddress: true,
        createdAt: true,
      },
    });
  }
}

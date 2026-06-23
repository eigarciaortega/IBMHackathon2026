import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma, SpaceStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

export interface FindSpacesQuery {
  type?: string;
  capacity?: number;
  floor?: string;
  zone?: string;
  resource?: string;
  status?: SpaceStatus;
  page?: number;
  limit?: number;
  excludeInactive?: boolean;
}

const includeResources = {
  spaceResources: { include: { resource: true } },
} satisfies Prisma.SpaceInclude;

@Injectable()
export class SpacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.space.findUnique({ where: { id }, include: includeResources });
  }

  /**
   * Crea el espacio y sus asociaciones de recursos en una transacción.
   */
  create(data: Prisma.SpaceCreateInput, resourceIds: string[] = []) {
    return this.prisma.space.create({
      data: {
        ...data,
        ...(resourceIds.length
          ? { spaceResources: { create: resourceIds.map((resourceId) => ({ resourceId })) } }
          : {}),
      },
      include: includeResources,
    });
  }

  /**
   * Actualiza el espacio; si se pasan resourceIds, reemplaza las asociaciones.
   */
  async update(id: string, data: Prisma.SpaceUpdateInput, resourceIds?: string[]) {
    return this.prisma.$transaction(async (tx) => {
      if (resourceIds) {
        await tx.spaceResource.deleteMany({ where: { spaceId: id } });
        if (resourceIds.length) {
          await tx.spaceResource.createMany({
            data: resourceIds.map((resourceId) => ({ spaceId: id, resourceId })),
            skipDuplicates: true,
          });
        }
      }
      return tx.space.update({ where: { id }, data, include: includeResources });
    });
  }

  async findMany(query: FindSpacesQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const where: Prisma.SpaceWhereInput = {
      ...(query.type ? { spaceType: query.type } : {}),
      ...(query.capacity ? { capacity: { gte: query.capacity } } : {}),
      ...(query.floor ? { floor: query.floor } : {}),
      ...(query.zone ? { zone: query.zone } : {}),
      ...(query.resource ? { spaceResources: { some: { resourceId: query.resource } } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.excludeInactive ? { status: { not: SpaceStatus.INACTIVE } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.space.findMany({
        where,
        include: includeResources,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.space.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Devuelve los IDs de recursos ACTIVE que existen, de entre los solicitados.
   * Sirve para validar resourceIds al crear/editar un espacio (ajuste Fase 5).
   */
  async findActiveResourceIds(resourceIds: string[]): Promise<string[]> {
    if (!resourceIds.length) {
      return [];
    }
    const rows = await this.prisma.resource.findMany({
      where: { id: { in: resourceIds }, status: 'ACTIVE' },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /**
   * Cuenta reservas futuras activas (CONFIRMED) de un espacio (decisión H-05).
   * Nota: usa fecha (>= hoy) como aproximación; el BookingsModule (fase futura)
   * refinará el corte exacto con fecha+hora en zona America/Mexico_City (T-03).
   */
  countActiveFutureBookings(spaceId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return this.prisma.booking.count({
      where: {
        spaceId,
        status: BookingStatus.CONFIRMED,
        bookingDate: { gte: startOfToday },
      },
    });
  }
}

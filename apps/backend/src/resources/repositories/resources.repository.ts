import { Injectable } from '@nestjs/common';
import { Prisma, ResourceStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

export interface FindResourcesQuery {
  search?: string;
  status?: ResourceStatus;
  page?: number;
  limit?: number;
  excludeInactive?: boolean;
}

@Injectable()
export class ResourcesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.resource.findUnique({ where: { id } });
  }

  findByName(name: string) {
    return this.prisma.resource.findUnique({ where: { name } });
  }

  create(data: Prisma.ResourceCreateInput) {
    return this.prisma.resource.create({ data });
  }

  update(id: string, data: Prisma.ResourceUpdateInput) {
    return this.prisma.resource.update({ where: { id }, data });
  }

  async findMany(query: FindResourcesQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const where: Prisma.ResourceWhereInput = {
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.excludeInactive ? { status: { not: ResourceStatus.INACTIVE } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.resource.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}

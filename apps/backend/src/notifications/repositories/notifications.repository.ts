import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

export interface FindNotificationsQuery {
  userId: string;
  isRead?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.NotificationCreateInput) {
    return this.prisma.notification.create({ data });
  }

  findById(id: string) {
    return this.prisma.notification.findUnique({ where: { id } });
  }

  markAsRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async findMany(query: FindNotificationsQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const where: Prisma.NotificationWhereInput = {
      userId: query.userId,
      ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
    };

    const [items, total, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId: query.userId, isRead: false } }),
    ]);

    return { items, total, unread, page, limit };
  }
}

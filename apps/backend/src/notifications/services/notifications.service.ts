import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationTemplates } from '../constants/notification-templates';
import {
  FindNotificationsQuery,
  NotificationsRepository,
} from '../repositories/notifications.repository';

/**
 * NotificationsService — notificaciones internas (decisión H-07).
 * Sin email, push ni WebSockets. Expone un método interno `create()` para que
 * otros módulos generen notificaciones; la generación nunca debe romper el flujo
 * de negocio (errores se loguean, no se propagan).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  // -------- API pública (endpoints) --------

  list(userId: string, query: Omit<FindNotificationsQuery, 'userId'>) {
    return this.notificationsRepository.findMany({ userId, ...query });
  }

  /** Marca como leída SOLO si la notificación pertenece al usuario (anti-IDOR). */
  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationsRepository.findById(id);
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada.');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('No tienes permisos sobre esta notificación.');
    }
    return this.notificationsRepository.markAsRead(id);
  }

  async markAllAsRead(userId: string) {
    const result = await this.notificationsRepository.markAllAsRead(userId);
    return { success: true, updated: result.count };
  }

  // -------- API interna (otros módulos) --------

  /**
   * Crea una notificación interna. Tolerante a fallos: si la escritura falla,
   * se registra en el logger pero NO se lanza excepción.
   */
  async create(userId: string, title: string, message: string): Promise<void> {
    try {
      await this.notificationsRepository.create({
        title,
        message,
        user: { connect: { id: userId } },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo crear notificación para ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // Helpers por evento (mensajería consistente)
  notifyBookingCreated(userId: string, spaceName: string, date: string, startTime: string) {
    const { title, message } = NotificationTemplates.bookingCreated(spaceName, date, startTime);
    return this.create(userId, title, message);
  }

  notifyBookingCancelled(userId: string, spaceName: string, date: string, startTime: string) {
    const { title, message } = NotificationTemplates.bookingCancelled(spaceName, date, startTime);
    return this.create(userId, title, message);
  }

  notifySpaceDeactivated(userId: string, spaceName: string) {
    const { title, message } = NotificationTemplates.spaceDeactivated(spaceName);
    return this.create(userId, title, message);
  }

  notifySpaceMaintenance(userId: string, spaceName: string) {
    const { title, message } = NotificationTemplates.spaceMaintenance(spaceName);
    return this.create(userId, title, message);
  }

  notifyUserDeactivated(userId: string) {
    const { title, message } = NotificationTemplates.userDeactivated();
    return this.create(userId, title, message);
  }
}

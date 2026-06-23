import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: any;

  const notif = { id: 'n1', userId: 'u1', title: 'T', message: 'M', isRead: false };

  beforeEach(() => {
    repo = {
      create: jest.fn().mockResolvedValue(notif),
      findById: jest.fn().mockResolvedValue(notif),
      markAsRead: jest.fn().mockResolvedValue({ ...notif, isRead: true }),
      markAllAsRead: jest.fn().mockResolvedValue({ count: 3 }),
      findMany: jest.fn().mockResolvedValue({ items: [notif], total: 1, unread: 1, page: 1, limit: 20 }),
    };
    service = new NotificationsService(repo);
  });

  it('lista solo notificaciones del usuario', async () => {
    await service.list('u1', {});
    expect(repo.findMany).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }));
  });

  it('marca como leída la propia', async () => {
    const res = await service.markAsRead('n1', 'u1');
    expect(res.isRead).toBe(true);
  });

  it('rechaza marcar como leída una ajena (403)', async () => {
    repo.findById.mockResolvedValueOnce({ ...notif, userId: 'otro' });
    await expect(service.markAsRead('n1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404 si la notificación no existe', async () => {
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.markAsRead('x', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('markAllAsRead devuelve cantidad actualizada', async () => {
    const res = await service.markAllAsRead('u1');
    expect(res).toEqual({ success: true, updated: 3 });
  });

  it('create interno es tolerante a fallos (no lanza)', async () => {
    repo.create.mockRejectedValueOnce(new Error('db down'));
    await expect(service.create('u1', 'T', 'M')).resolves.toBeUndefined();
  });

  it('notifyBookingCreated usa la plantilla y crea', async () => {
    await service.notifyBookingCreated('u1', 'Sala A', '2026-07-01', '09:00');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Reserva creada', user: { connect: { id: 'u1' } } }),
    );
  });
});

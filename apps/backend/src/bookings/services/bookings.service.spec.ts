import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, SpaceStatus, UserStatus } from '@prisma/client';
import { BookingsService } from './bookings.service';

const FUTURE = '2099-07-01';
const PAST = '2000-01-01';

const t = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

function buildBooking(over: Partial<any> = {}) {
  return {
    id: 'b1',
    userId: 'c1',
    spaceId: 'sp1',
    bookingDate: d(FUTURE),
    startTime: t('09:00'),
    endTime: t('10:00'),
    attendeesCount: 4,
    purpose: 'Reunión',
    status: BookingStatus.CONFIRMED,
    isRecurring: false,
    createdBy: 'c1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

describe('BookingsService', () => {
  let service: BookingsService;
  let repo: any;
  let audit: any;
  let notifications: any;

  const admin = { id: 'admin', email: 'a@x.com', role: 'ADMIN' as const };
  const collab = { id: 'c1', email: 'c@x.com', role: 'COLLABORATOR' as const };

  beforeEach(() => {
    repo = {
      findSpaceById: jest.fn().mockResolvedValue({ id: 'sp1', status: SpaceStatus.AVAILABLE, capacity: 8 }),
      findUserById: jest.fn().mockResolvedValue({ id: 'c1', status: UserStatus.ACTIVE }),
      findConfirmedBySpaceAndDate: jest.fn().mockResolvedValue([]),
      findConfirmedByUserFrom: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue(buildBooking()),
      findById: jest.fn().mockResolvedValue(buildBooking()),
      updateStatus: jest.fn().mockImplementation((id, status) => Promise.resolve(buildBooking({ status }))),
      findMany: jest.fn().mockResolvedValue({ items: [buildBooking()], total: 1, page: 1, limit: 20 }),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    notifications = {
      notifyBookingCreated: jest.fn().mockResolvedValue(undefined),
      notifyBookingCancelled: jest.fn().mockResolvedValue(undefined),
    };
    service = new BookingsService(repo, audit, notifications);
  });

  const baseDto = {
    spaceId: 'sp1',
    date: FUTURE,
    startTime: '09:00',
    endTime: '10:00',
    attendeesCount: 4,
    purpose: 'Reunión',
  };

  it('crea reserva válida y audita CREATE_BOOKING', async () => {
    const res = await service.create(baseDto, collab, '127.0.0.1');
    expect(res.status).toBe(BookingStatus.CONFIRMED);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE_BOOKING', success: true }),
    );
  });

  it('rechaza solapamiento (409)', async () => {
    repo.findConfirmedBySpaceAndDate.mockResolvedValueOnce([
      buildBooking({ startTime: t('09:00'), endTime: t('10:00') }),
    ]);
    await expect(
      service.create({ ...baseDto, startTime: '09:30', endTime: '10:30' }, admin),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('permite reservas consecutivas (10:00 tras 09:00-10:00)', async () => {
    repo.findConfirmedBySpaceAndDate.mockResolvedValueOnce([
      buildBooking({ startTime: t('09:00'), endTime: t('10:00') }),
    ]);
    const res = await service.create({ ...baseDto, startTime: '10:00', endTime: '11:00' }, admin);
    expect(res.status).toBe(BookingStatus.CONFIRMED);
  });

  it('rechaza capacidad excedida (400)', async () => {
    await expect(
      service.create({ ...baseDto, attendeesCount: 10 }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza hora fin <= inicio (400)', async () => {
    await expect(
      service.create({ ...baseDto, startTime: '10:00', endTime: '09:00' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza fecha pasada (400)', async () => {
    await expect(service.create({ ...baseDto, date: PAST }, admin)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza espacio no disponible (400)', async () => {
    repo.findSpaceById.mockResolvedValueOnce({ id: 'sp1', status: SpaceStatus.MAINTENANCE, capacity: 8 });
    await expect(service.create(baseDto, admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza espacio inexistente (404)', async () => {
    repo.findSpaceById.mockResolvedValueOnce(null);
    await expect(service.create(baseDto, admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('aplica límite de 5 a COLLABORATOR (409)', async () => {
    repo.findConfirmedByUserFrom.mockResolvedValueOnce(
      Array.from({ length: 5 }, (_, i) => buildBooking({ id: `f${i}` })),
    );
    await expect(service.create(baseDto, collab)).rejects.toBeInstanceOf(ConflictException);
  });

  it('ADMIN exento del límite de 5', async () => {
    repo.findConfirmedByUserFrom.mockResolvedValueOnce(
      Array.from({ length: 8 }, (_, i) => buildBooking({ id: `f${i}` })),
    );
    const res = await service.create(baseDto, admin);
    expect(res.status).toBe(BookingStatus.CONFIRMED);
  });

  it('captura violación de exclusion constraint y devuelve 409', async () => {
    repo.create.mockRejectedValueOnce(new Error('conflicting key value violates exclusion constraint "no_overlapping_bookings"'));
    await expect(service.create(baseDto, admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('validate() devuelve available=false ante conflicto', async () => {
    repo.findConfirmedBySpaceAndDate.mockResolvedValueOnce([
      buildBooking({ startTime: t('09:00'), endTime: t('10:00') }),
    ]);
    const res = await service.validate({ ...baseDto, startTime: '09:30', endTime: '10:30' }, admin);
    expect(res.available).toBe(false);
  });

  it('COLLABORATOR solo ve sus reservas en findAll', async () => {
    await service.findAll({}, collab);
    expect(repo.findMany).toHaveBeenCalledWith(expect.objectContaining({ userId: 'c1' }));
  });

  it('cancela reserva propia confirmada futura', async () => {
    const res = await service.cancel('b1', collab, '127.0.0.1');
    expect(res.status).toBe(BookingStatus.CANCELLED);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CANCEL_BOOKING', success: true }),
    );
  });

  it('no cancela reserva de otro usuario (403)', async () => {
    repo.findById.mockResolvedValueOnce(buildBooking({ userId: 'otro' }));
    await expect(service.cancel('b1', collab)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('no cancela reserva ya finalizada (400)', async () => {
    repo.findById.mockResolvedValueOnce(buildBooking({ bookingDate: d(PAST), endTime: t('10:00') }));
    await expect(service.cancel('b1', admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('NO_SHOW requiere reserva finalizada (400 si no terminó)', async () => {
    repo.findById.mockResolvedValueOnce(buildBooking({ bookingDate: d(FUTURE) }));
    await expect(service.markNoShow('b1', admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('NO_SHOW válido tras finalizar audita MARK_NO_SHOW', async () => {
    repo.findById.mockResolvedValueOnce(buildBooking({ bookingDate: d(PAST), endTime: t('10:00') }));
    const res = await service.markNoShow('b1', admin, '127.0.0.1');
    expect(res.status).toBe(BookingStatus.NO_SHOW);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MARK_NO_SHOW', success: true }),
    );
  });

  it('isOwner: true si no existe, true si propietario, false si ajeno', async () => {
    repo.findById.mockResolvedValueOnce(null);
    expect(await service.isOwner('x', 'c1')).toBe(true);
    repo.findById.mockResolvedValueOnce(buildBooking({ userId: 'c1' }));
    expect(await service.isOwner('b1', 'c1')).toBe(true);
    repo.findById.mockResolvedValueOnce(buildBooking({ userId: 'otro' }));
    expect(await service.isOwner('b1', 'c1')).toBe(false);
  });

  it('FINISHED derivado: CONFIRMED pasada se reporta como FINISHED', async () => {
    repo.findById.mockResolvedValueOnce(buildBooking({ bookingDate: d(PAST), endTime: t('10:00') }));
    const res = await service.findOne('b1', admin);
    expect(res.status).toBe(BookingStatus.FINISHED);
  });
});

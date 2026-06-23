import { BadRequestException } from '@nestjs/common';
import { ExportService } from './export.service';

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const t = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

describe('ExportService', () => {
  let service: ExportService;
  let repo: any;

  beforeEach(() => {
    repo = {
      findBookings: jest.fn().mockResolvedValue([
        {
          id: 'b1',
          userId: 'u1',
          spaceId: 'sp1',
          bookingDate: d('2026-07-01'),
          startTime: t('09:00'),
          endTime: t('10:00'),
          attendeesCount: 4,
          purpose: 'Reunión, importante',
          status: 'CONFIRMED',
          createdAt: new Date('2026-06-01T12:00:00.000Z'),
          user: { email: 'c@x.com' },
          space: { name: 'Sala A' },
        },
      ]),
      findSpaces: jest.fn().mockResolvedValue([]),
      findUsers: jest.fn().mockResolvedValue([
        {
          id: 'u1',
          firstName: 'Ana',
          lastName: 'Torres',
          email: 'ana@x.com',
          status: 'ACTIVE',
          mustChangePassword: false,
          lastLogin: null,
          createdAt: new Date('2026-06-01T12:00:00.000Z'),
          role: { name: 'COLLABORATOR' },
        },
      ]),
      findAudit: jest.fn().mockResolvedValue([]),
    };
    service = new ExportService(repo);
  });

  it('exporta bookings en CSV con cabeceras y escapado de comas', async () => {
    const res = await service.exportBookings('csv');
    expect(res.contentType).toContain('text/csv');
    expect(res.filename).toMatch(/^bookings_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(res.content).toContain('id,userId,userEmail');
    expect(res.content).toContain('"Reunión, importante"'); // comilla por la coma
    expect(res.content).toContain('Sala A');
  });

  it('users CSV no incluye passwordHash ni temporaryPassword', async () => {
    const res = await service.exportUsers('csv');
    expect(res.content).not.toContain('passwordHash');
    expect(res.content).not.toContain('temporaryPassword');
    expect(res.content).toContain('ana@x.com');
  });

  it('rechaza xlsx con 400 (no implementado en MVP)', async () => {
    await expect(service.exportBookings('xlsx')).rejects.toBeInstanceOf(BadRequestException);
  });
});

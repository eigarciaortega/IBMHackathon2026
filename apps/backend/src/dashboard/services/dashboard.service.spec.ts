import { BookingStatus, SpaceStatus } from '@prisma/client';
import { DashboardService } from './dashboard.service';

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const t = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const FUTURE = '2099-07-01';
const PAST = '2000-01-01';

describe('DashboardService', () => {
  let service: DashboardService;
  let repo: any;

  const metrics = [
    { spaceId: 'sp1', bookingDate: d(FUTURE), startTime: t('09:00'), status: BookingStatus.CONFIRMED, space: { name: 'Sala A', spaceType: 'Meeting Room Medium' } },
    { spaceId: 'sp1', bookingDate: d(FUTURE), startTime: t('09:00'), status: BookingStatus.CONFIRMED, space: { name: 'Sala A', spaceType: 'Meeting Room Medium' } },
    { spaceId: 'sp2', bookingDate: d(FUTURE), startTime: t('14:00'), status: BookingStatus.NO_SHOW, space: { name: 'Sala B', spaceType: 'Desk' } },
  ];

  beforeEach(() => {
    repo = {
      countSpaces: jest.fn().mockImplementation((status?: SpaceStatus) => {
        if (status === SpaceStatus.AVAILABLE) return Promise.resolve(5);
        if (status === SpaceStatus.MAINTENANCE) return Promise.resolve(1);
        return Promise.resolve(8);
      }),
      countBookingsOnDate: jest.fn().mockResolvedValue(2),
      countBookingsInRange: jest.fn().mockResolvedValue(4),
      countByStatus: jest.fn().mockImplementation((s: BookingStatus) =>
        Promise.resolve(s === BookingStatus.CANCELLED ? 3 : 1),
      ),
      countAllBookings: jest.fn().mockResolvedValue(20),
      findNonCancelledForMetrics: jest.fn().mockResolvedValue(metrics),
      findSpacesBasic: jest.fn().mockResolvedValue([
        { id: 'sp1', name: 'Sala A', spaceType: 'Meeting Room Medium', status: SpaceStatus.AVAILABLE },
        { id: 'sp2', name: 'Sala B', spaceType: 'Desk', status: SpaceStatus.AVAILABLE },
        { id: 'sp3', name: 'Sala C', spaceType: 'Desk', status: SpaceStatus.AVAILABLE },
      ]),
      findUserConfirmedFrom: jest.fn().mockResolvedValue([
        { id: 'b1', spaceId: 'sp1', bookingDate: d(FUTURE), startTime: t('09:00'), endTime: t('10:00'), space: { id: 'sp1', name: 'Sala A', spaceType: 'X' } },
        { id: 'b2', spaceId: 'sp2', bookingDate: d(PAST), startTime: t('09:00'), endTime: t('10:00'), space: { id: 'sp2', name: 'Sala B', spaceType: 'Y' } },
      ]),
    };
    service = new DashboardService(repo);
  });

  it('admin: arma métricas y topSpaces ordenado', async () => {
    const res = await service.getAdminDashboard();
    expect(res.totalSpaces).toBe(8);
    expect(res.availableSpaces).toBe(5);
    expect(res.maintenanceSpaces).toBe(1);
    expect(res.todayBookings).toBe(2);
    expect(res.weeklyBookings).toBe(4);
    expect(res.cancelledBookings).toBe(3);
    expect(res.topSpaces[0]).toEqual({ spaceId: 'sp1', name: 'Sala A', count: 2 });
    expect(res.peakHours.find((p) => p.hour === 9)?.count).toBe(2);
    expect(res.occupancyRate).toBeGreaterThanOrEqual(0);
  });

  it('analytics: incluye espacios con 0 reservas en leastSpaces y tasas', async () => {
    const res = await service.getAnalytics();
    expect(res.totalBookings).toBe(20);
    expect(res.cancellationRate).toBe(15); // 3/20
    expect(res.leastSpaces.some((s) => s.spaceId === 'sp3' && s.count === 0)).toBe(true);
    expect(res.bookingsPerDay).toHaveLength(7);
  });

  it('collaborator: excluye reservas finalizadas (FINISHED derivado)', async () => {
    const res = await service.getCollaboratorDashboard('u1');
    expect(res.upcomingBookings).toHaveLength(1);
    expect(res.upcomingBookings[0].id).toBe('b1');
    expect(res.availableSpaces).toBe(5);
  });
});

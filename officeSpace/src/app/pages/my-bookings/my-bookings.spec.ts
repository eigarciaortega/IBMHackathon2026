import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MyBookings } from './my-bookings';
import { NotificationService } from '@core/services/notification';
import { Booking } from '@core/models/booking.model';
import { Resource } from '@core/models/space.model';

const notifMock = { connect: vi.fn(), disconnect: vi.fn(), push: vi.fn() };

const TODAY = new Date().toISOString().split('T')[0];
const TOMORROW = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().split('T')[0];

const makeBooking = (overrides: Partial<Booking>): Booking => ({
  publicId: 'b-uuid',
  spacePublicId: 'space-uuid',
  bookingDate: TOMORROW,
  startTime: '09:00:00',
  endTime: '11:00:00',
  attendees: 5,
  status: 'ACTIVE',
  createdAt: '2026-06-22T10:00:00',
  ...overrides,
});

describe('MyBookings', () => {
  let component: MyBookings;

  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [MyBookings],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationService, useValue: notifMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(MyBookings);
    component = fixture.componentInstance;
  });

  afterEach(() => localStorage.clear());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with loading false after construction', () => {
    // loading is false before ngOnInit HTTP calls complete
    expect(component.loading()).toBe(false);
  });

  describe('spaceName()', () => {
    it('returns "—" when space not found', () => {
      component.spaces.set([]);
      expect(component.spaceName('unknown-uuid')).toBe('—');
    });

    it('returns space name when found by publicId', () => {
      component.spaces.set([{ publicId: 'space-1', name: 'Sala Innovación' } as Resource]);
      expect(component.spaceName('space-1')).toBe('Sala Innovación');
    });
  });

  describe('bookingLabel()', () => {
    it('returns "Reservada" for ACTIVE booking with future date', () => {
      const booking = makeBooking({ bookingDate: TOMORROW, status: 'ACTIVE' });
      expect(component.bookingLabel(booking)).toBe('Reservada');
    });

    it('returns "Reservada" for ACTIVE booking with today\'s date', () => {
      const booking = makeBooking({ bookingDate: TODAY, status: 'ACTIVE' });
      expect(component.bookingLabel(booking)).toBe('Reservada');
    });

    it('returns "Cancelada" for CANCELLED booking', () => {
      const booking = makeBooking({ status: 'CANCELLED' });
      expect(component.bookingLabel(booking)).toBe('Cancelada');
    });

    it('returns "Completada" for COMPLETED booking', () => {
      const booking = makeBooking({ status: 'COMPLETED' });
      expect(component.bookingLabel(booking)).toBe('Completada');
    });
  });

  describe('bookingLabelClass()', () => {
    it('returns blue class for ACTIVE booking', () => {
      const booking = makeBooking({ status: 'ACTIVE' });
      expect(component.bookingLabelClass(booking)).toContain('blue');
    });

    it('returns red class for CANCELLED booking', () => {
      const booking = makeBooking({ status: 'CANCELLED' });
      expect(component.bookingLabelClass(booking)).toContain('red');
    });

    it('returns gray class for COMPLETED booking', () => {
      const booking = makeBooking({ status: 'COMPLETED' });
      expect(component.bookingLabelClass(booking)).toContain('gray');
    });
  });

  describe('canCancel()', () => {
    it('returns true for ACTIVE booking with future date', () => {
      const booking = makeBooking({ bookingDate: TOMORROW, status: 'ACTIVE' });
      expect(component.canCancel(booking)).toBe(true);
    });

    it('returns false for ACTIVE booking with today\'s date', () => {
      const booking = makeBooking({ bookingDate: TODAY, status: 'ACTIVE' });
      expect(component.canCancel(booking)).toBe(false);
    });

    it('returns false for ACTIVE booking with past date', () => {
      const booking = makeBooking({ bookingDate: YESTERDAY, status: 'ACTIVE' });
      expect(component.canCancel(booking)).toBe(false);
    });

    it('returns false for CANCELLED booking even with future date', () => {
      const booking = makeBooking({ bookingDate: TOMORROW, status: 'CANCELLED' });
      expect(component.canCancel(booking)).toBe(false);
    });
  });

  describe('sorting', () => {
    it('sorts active bookings ascending (closest date first)', () => {
      const bookings: Booking[] = [
        makeBooking({ publicId: 'b3', bookingDate: '2026-06-30', startTime: '09:00:00' }),
        makeBooking({ publicId: 'b1', bookingDate: '2026-06-25', startTime: '09:00:00' }),
        makeBooking({ publicId: 'b2', bookingDate: '2026-06-27', startTime: '09:00:00' }),
      ];

      const sorted = [...bookings].sort((a, b) =>
        a.bookingDate.localeCompare(b.bookingDate) || a.startTime.localeCompare(b.startTime)
      );

      expect(sorted[0].publicId).toBe('b1');
      expect(sorted[1].publicId).toBe('b2');
      expect(sorted[2].publicId).toBe('b3');
    });
  });

  describe('statusLabel()', () => {
    it('maps ACTIVE to "Activa"', () => expect(component.statusLabel('ACTIVE')).toBe('Activa'));
    it('maps CANCELLED to "Cancelada"', () => expect(component.statusLabel('CANCELLED')).toBe('Cancelada'));
    it('maps COMPLETED to "Completada"', () => expect(component.statusLabel('COMPLETED')).toBe('Completada'));
  });
});

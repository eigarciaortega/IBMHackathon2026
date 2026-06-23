import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BookingService } from './booking';

const API = 'http://localhost:8082/api/bookings';

describe('BookingService', () => {
  let service: BookingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BookingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('create()', () => {
    it('makes POST to /api/bookings', () => {
      const request: any = { spacePublicId: 'uuid-1', bookingDate: '2026-06-25', startTime: '09:00', endTime: '11:00', attendees: 5 };
      service.create(request).subscribe();

      const req = httpMock.expectOne(API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush({ publicId: 'booking-uuid' });
    });
  });

  describe('getMyBookings()', () => {
    it('makes GET to /api/bookings/my', () => {
      service.getMyBookings().subscribe();

      const req = httpMock.expectOne(`${API}/my`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('getMyHistory()', () => {
    it('makes GET to /api/bookings/my/history', () => {
      service.getMyHistory().subscribe();

      const req = httpMock.expectOne(`${API}/my/history`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('cancel()', () => {
    it('makes DELETE to /api/bookings/{publicId}', () => {
      service.cancel('booking-uuid').subscribe();

      const req = httpMock.expectOne(`${API}/booking-uuid`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('adminCancel()', () => {
    it('makes DELETE to /api/bookings/admin/{publicId}', () => {
      service.adminCancel('booking-uuid').subscribe();

      const req = httpMock.expectOne(`${API}/admin/booking-uuid`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getOccupied()', () => {
    it('makes GET to /api/bookings/occupied with query params', () => {
      service.getOccupied('2026-06-25', '09:00', '11:00').subscribe();

      const req = httpMock.expectOne(r => r.url === `${API}/occupied`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('date')).toBe('2026-06-25');
      expect(req.request.params.get('startTime')).toBe('09:00');
      expect(req.request.params.get('endTime')).toBe('11:00');
      req.flush([]);
    });
  });

  describe('getAllHistory()', () => {
    it('makes GET to /api/bookings/history', () => {
      service.getAllHistory().subscribe();

      const req = httpMock.expectOne(`${API}/history`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });
});

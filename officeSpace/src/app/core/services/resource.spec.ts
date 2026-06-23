import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ResourceService } from './resource';

const API = 'http://localhost:8081/api/resources';

describe('ResourceService', () => {
  let service: ResourceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ResourceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAll()', () => {
    it('makes GET to /api/resources without params when no filters', () => {
      service.getAll().subscribe();
      const req = httpMock.expectOne(API);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('adds type query param when filter provided', () => {
      service.getAll({ type: 'ROOM' }).subscribe();
      const req = httpMock.expectOne(r => r.url === API);
      expect(req.request.params.get('type')).toBe('ROOM');
      req.flush([]);
    });

    it('adds minCapacity query param when filter provided', () => {
      service.getAll({ minCapacity: 8 }).subscribe();
      const req = httpMock.expectOne(r => r.url === API);
      expect(req.request.params.get('minCapacity')).toBe('8');
      req.flush([]);
    });

    it('adds both type and minCapacity when both filters provided', () => {
      service.getAll({ type: 'ROOM', minCapacity: 6 }).subscribe();
      const req = httpMock.expectOne(r => r.url === API);
      expect(req.request.params.get('type')).toBe('ROOM');
      expect(req.request.params.get('minCapacity')).toBe('6');
      req.flush([]);
    });
  });

  describe('create()', () => {
    it('makes POST to /api/resources', () => {
      const payload: any = { name: 'Sala A', type: 'ROOM', capacity: 10, location: 'Piso 1', features: {} };
      service.create(payload).subscribe();
      const req = httpMock.expectOne(API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ publicId: 'new-uuid', ...payload, active: true });
    });
  });

  describe('update()', () => {
    it('makes PUT to /api/resources/{publicId}', () => {
      const payload: any = { name: 'Sala B', type: 'ROOM', capacity: 12, location: 'Piso 2', features: {} };
      service.update('existing-uuid', payload).subscribe();
      const req = httpMock.expectOne(`${API}/existing-uuid`);
      expect(req.request.method).toBe('PUT');
      req.flush({ publicId: 'existing-uuid', ...payload });
    });
  });

  describe('delete()', () => {
    it('makes DELETE to /api/resources/{publicId}', () => {
      service.delete('space-uuid').subscribe();
      const req = httpMock.expectOne(`${API}/space-uuid`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});

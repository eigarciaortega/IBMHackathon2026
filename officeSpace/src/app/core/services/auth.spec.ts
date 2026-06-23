import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth';
import { NotificationService } from './notification';

const notifMock = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  push: vi.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationService, useValue: notifMock },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isLoggedIn()', () => {
    it('returns false when no token in localStorage', () => {
      expect(service.isLoggedIn()).toBe(false);
    });

    it('returns true when token exists in localStorage', () => {
      localStorage.setItem('token', 'fake-jwt');
      expect(service.isLoggedIn()).toBe(true);
    });
  });

  describe('isAdmin()', () => {
    it('returns false when no user is set', () => {
      expect(service.isAdmin()).toBe(false);
    });

    it('returns true when current user has ADMIN role', () => {
      service.currentUser.set({ role: 'ADMIN' } as any);
      expect(service.isAdmin()).toBe(true);
    });

    it('returns false when current user has COLLABORATOR role', () => {
      service.currentUser.set({ role: 'COLLABORATOR' } as any);
      expect(service.isAdmin()).toBe(false);
    });
  });

  describe('getToken()', () => {
    it('returns null when no token stored', () => {
      expect(service.getToken()).toBeNull();
    });

    it('returns the stored JWT token', () => {
      localStorage.setItem('token', 'eyJhbGci.test');
      expect(service.getToken()).toBe('eyJhbGci.test');
    });
  });

  describe('login()', () => {
    it('makes POST to /api/auth/login with credentials', () => {
      service.login('admin@test.com', 'pass123').subscribe();

      const req = httpMock.expectOne('http://localhost:8083/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'admin@test.com', password: 'pass123' });
      req.flush({ token: 'jwt', tokenType: 'Bearer', email: 'admin@test.com', name: 'Admin', role: 'ADMIN', publicId: 'uuid' });
    });

    it('stores token and user in localStorage on success', () => {
      const fakeUser = { token: 'tok123', tokenType: 'Bearer', email: 'admin@test.com', name: 'Admin', role: 'ADMIN', publicId: 'uuid' };

      service.login('admin@test.com', 'Admin123').subscribe();

      const req = httpMock.expectOne('http://localhost:8083/api/auth/login');
      req.flush(fakeUser);

      expect(localStorage.getItem('token')).toBe('tok123');
      expect(JSON.parse(localStorage.getItem('user')!).email).toBe('admin@test.com');
    });
  });

  describe('logout()', () => {
    it('clears localStorage, resets currentUser and navigates to /login', () => {
      const router = TestBed.inject(Router);
      vi.spyOn(router, 'navigate').mockResolvedValue(true);

      localStorage.setItem('token', 'tok');
      service.currentUser.set({ role: 'ADMIN' } as any);

      service.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(notifMock.disconnect).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});

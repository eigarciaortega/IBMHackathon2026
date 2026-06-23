import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { authGuard } from './auth-guard';
import { AuthService } from '@core/services/auth';
import { NotificationService } from '@core/services/notification';

const notifMock = { connect: vi.fn(), disconnect: vi.fn(), push: vi.fn() };

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...args) =>
    TestBed.runInInjectionContext(() => authGuard(...args));

  let authService: AuthService;
  let router: Router;

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

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => localStorage.clear());

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('returns true when user is logged in', () => {
    localStorage.setItem('token', 'valid-jwt');
    const result = executeGuard({} as any, {} as any);
    expect(result).toBe(true);
  });

  it('returns false and redirects to /login when not authenticated', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const result = executeGuard({} as any, {} as any);
    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});

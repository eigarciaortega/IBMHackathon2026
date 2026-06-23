import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { adminGuard } from './admin-guard';
import { AuthService } from '@core/services/auth';
import { NotificationService } from '@core/services/notification';

const notifMock = { connect: vi.fn(), disconnect: vi.fn(), push: vi.fn() };

describe('adminGuard', () => {
  const executeGuard: CanActivateFn = (...args) =>
    TestBed.runInInjectionContext(() => adminGuard(...args));

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

  it('returns true when user has ADMIN role', () => {
    authService.currentUser.set({ role: 'ADMIN' } as any);
    const result = executeGuard({} as any, {} as any);
    expect(result).toBe(true);
  });

  it('returns false and redirects to /search when user is COLLABORATOR', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    authService.currentUser.set({ role: 'COLLABORATOR' } as any);
    const result = executeGuard({} as any, {} as any);
    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/search']);
  });

  it('returns false when no user is set', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const result = executeGuard({} as any, {} as any);
    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/search']);
  });
});

import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { jwtInterceptor } from './jwt-interceptor';
import { NotificationService } from '@core/services/notification';

const notifMock = { connect: vi.fn(), disconnect: vi.fn(), push: vi.fn() };

describe('jwtInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => jwtInterceptor(req, next));

  let client: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationService, useValue: notifMock },
      ],
    });

    client = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('adds Authorization header when token is stored', () => {
    localStorage.setItem('token', 'eyJhbGci.payload.sig');
    client.get('http://localhost:8082/api/test').subscribe();

    const req = httpMock.expectOne('http://localhost:8082/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer eyJhbGci.payload.sig');
    req.flush({});
  });

  it('does not add Authorization header when no token stored', () => {
    client.get('http://localhost:8082/api/test').subscribe();

    const req = httpMock.expectOne('http://localhost:8082/api/test');
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
  });
});

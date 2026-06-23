import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Login } from './login';
import { NotificationService } from '@core/services/notification';

const notifMock = { connect: vi.fn(), disconnect: vi.fn(), push: vi.fn() };

describe('Login', () => {
  let component: Login;

  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationService, useValue: notifMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
  });

  afterEach(() => localStorage.clear());

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('starts with loading false and empty error', () => {
    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('');
  });

  it('starts with email and password empty', () => {
    expect(component.email).toBe('');
    expect(component.password).toBe('');
  });

  describe('fillDemo()', () => {
    it('sets email and password from demo user', () => {
      const demoUser = { email: 'admin@corp.com', password: 'Admin123', role: 'Administrador' };
      component.fillDemo(demoUser);
      expect(component.email).toBe('admin@corp.com');
      expect(component.password).toBe('Admin123');
    });

    it('clears error when filling demo', () => {
      component.error.set('Previous error');
      component.fillDemo({ email: 'a@b.com', password: 'pass', role: 'rol' });
      expect(component.error()).toBe('');
    });
  });

  describe('onLogin()', () => {
    it('does nothing when email is empty', () => {
      component.email = '';
      component.password = 'pass123';
      component.onLogin();
      expect(component.loading()).toBe(false);
    });

    it('does nothing when password is empty', () => {
      component.email = 'admin@corp.com';
      component.password = '';
      component.onLogin();
      expect(component.loading()).toBe(false);
    });

    it('sets loading to true when credentials are provided', () => {
      component.email = 'admin@corp.com';
      component.password = 'Admin123';
      component.onLogin();
      expect(component.loading()).toBe(true);
    });
  });

  describe('demo users', () => {
    it('has 3 predefined demo users', () => {
      expect(component.demoUsers.length).toBe(3);
    });

    it('first demo user is the admin', () => {
      expect(component.demoUsers[0].email).toBe('admin@corporativoalpha.com');
      expect(component.demoUsers[0].role).toBe('Administrador');
    });
  });
});

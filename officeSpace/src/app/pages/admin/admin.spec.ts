import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Admin } from './admin';
import { NotificationService } from '@core/services/notification';
import { Resource } from '@core/models/space.model';

const notifMock = { connect: vi.fn(), disconnect: vi.fn(), push: vi.fn() };

describe('Admin', () => {
  let component: Admin;

  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [Admin],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationService, useValue: notifMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Admin);
    component = fixture.componentInstance;
  });

  afterEach(() => localStorage.clear());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts on dashboard tab', () => {
    expect(component.activeTab()).toBe('dashboard');
  });

  describe('statusLabel()', () => {
    it('maps ACTIVE to "Reservada"', () => {
      expect(component.statusLabel('ACTIVE')).toBe('Reservada');
    });

    it('maps CANCELLED to "Disponible"', () => {
      expect(component.statusLabel('CANCELLED')).toBe('Disponible');
    });

    it('maps COMPLETED to "Completada"', () => {
      expect(component.statusLabel('COMPLETED')).toBe('Completada');
    });

    it('returns the raw status for unknown values', () => {
      expect(component.statusLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('statusClass()', () => {
    it('returns blue class for ACTIVE (Reservada)', () => {
      expect(component.statusClass('ACTIVE')).toContain('blue');
    });

    it('returns green class for CANCELLED (Disponible)', () => {
      expect(component.statusClass('CANCELLED')).toContain('green');
    });

    it('returns gray class for COMPLETED', () => {
      expect(component.statusClass('COMPLETED')).toContain('gray');
    });
  });

  describe('spaceName()', () => {
    it('returns space name when found by publicId', () => {
      component.spaces.set([{ publicId: 'sp-1', name: 'Sala Innovación' } as Resource]);
      expect(component.spaceName('sp-1')).toBe('Sala Innovación');
    });

    it('returns truncated UUID when space not found', () => {
      component.spaces.set([]);
      const result = component.spaceName('00000000-0000-0000-0000-000000000001');
      expect(result).toContain('00000000');
    });
  });

  describe('setTab()', () => {
    it('changes the active tab', () => {
      component.setTab('spaces');
      expect(component.activeTab()).toBe('spaces');
    });
  });

  describe('formatTime()', () => {
    it('returns HH:MM from HH:MM:SS string', () => {
      expect(component.formatTime('09:30:00')).toBe('09:30');
    });
  });
});

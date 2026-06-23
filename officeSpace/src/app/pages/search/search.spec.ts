import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Search } from './search';
import { NotificationService } from '@core/services/notification';

const notifMock = { connect: vi.fn(), disconnect: vi.fn(), push: vi.fn() };

describe('Search', () => {
  let component: Search;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [Search],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationService, useValue: notifMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Search);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); // triggers ngOnInit → loadSpaces()
    httpMock.expectOne(r => r.url.includes('/api/resources')).flush([]);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with empty spaces list', () => {
    expect(component.spaces()).toEqual([]);
  });

  it('starts with empty occupiedIds set', () => {
    expect(component.occupiedIds().size).toBe(0);
  });

  it('starts with no selected space (modal closed)', () => {
    expect(component.selectedSpace()).toBeNull();
  });

  it('initialises filterDate to today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(component.filterDate).toBe(today);
  });

  it('initialises filterStartTime to 09:00', () => {
    expect(component.filterStartTime).toBe('09:00');
  });

  describe('isOccupied()', () => {
    it('returns false when space publicId is not in occupiedIds', () => {
      component.occupiedIds.set(new Set(['other-id']));
      expect(component.isOccupied('space-1')).toBe(false);
    });

    it('returns true when space publicId is in occupiedIds', () => {
      component.occupiedIds.set(new Set(['space-1', 'space-2']));
      expect(component.isOccupied('space-1')).toBe(true);
    });
  });

  describe('openBooking() / closeModal()', () => {
    it('sets selectedSpace when opening booking modal', () => {
      const space: any = { publicId: 'sp-1', name: 'Sala A', type: 'ROOM', capacity: 8, location: 'Piso 1', features: {}, active: true };
      component.openBooking(space);
      expect(component.selectedSpace()).toBe(space);
    });

    it('clears selectedSpace when closing modal', () => {
      component.selectedSpace.set({ publicId: 'sp-1' } as any);
      component.closeModal();
      expect(component.selectedSpace()).toBeNull();
    });

    it('resets bookingAttendees to 1 when opening', () => {
      component.bookingAttendees = 5;
      component.openBooking({ publicId: 'sp-1' } as any);
      expect(component.bookingAttendees).toBe(1);
    });
  });

  describe('featureChips()', () => {
    it('returns empty array when no features', () => {
      expect(component.featureChips({})).toEqual([]);
    });

    it('includes "Proyector" when has_projector is true', () => {
      expect(component.featureChips({ has_projector: true })).toContain('Proyector');
    });

    it('includes "Pizarrón" when whiteboard is true', () => {
      expect(component.featureChips({ whiteboard: true })).toContain('Pizarrón');
    });

    it('includes monitor count when monitors > 0', () => {
      const chips = component.featureChips({ monitors: 2 });
      expect(chips.some(c => c.includes('2'))).toBe(true);
    });
  });
});

import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ResourceService } from '@core/services/resource';
import { BookingService } from '@core/services/booking';
import { NotificationService } from '@core/services/notification';
import { Resource, ResourceType } from '@core/models/space.model';
import { BookingRequest } from '@core/models/booking.model';

@Component({
  selector: 'app-search',
  imports: [FormsModule],
  templateUrl: './search.html',
  styleUrl: './search.css'
})
export class Search implements OnInit {
  private resourceService = inject(ResourceService);
  private bookingService = inject(BookingService);
  private notif = inject(NotificationService);

  spaces = signal<Resource[]>([]);
  occupiedIds = signal<Set<string>>(new Set());
  loading = signal(false);
  searched = signal(false);

  filterType: ResourceType | '' = '';
  filterDate = new Date().toISOString().split('T')[0];
  filterStartTime = '09:00';
  filterEndTime = '10:00';
  filterMinCapacity: number | null = null;

  selectedSpace = signal<Resource | null>(null);
  bookingAttendees = 1;
  bookingNotes = '';
  bookingLoading = signal(false);
  bookingError = signal('');
  bookingSuccess = signal(false);

  ngOnInit(): void {
    this.loadSpaces();
  }

  // Carga la lista de espacios (type/capacity) y aplica la info de disponibilidad recibida
  private loadSpaces(occupied: string[] = [], markSearched = false): void {
    this.resourceService.getAll({
      type: this.filterType || undefined,
      minCapacity: this.filterMinCapacity ?? undefined
    }).subscribe({
      next: (spaces) => {
        this.occupiedIds.set(new Set(occupied));
        this.spaces.set(spaces.filter(s => s.active));
        if (markSearched) this.searched.set(true);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  search(): void {
    this.loading.set(true);
    const start = this.filterStartTime + ':00';
    const end   = this.filterEndTime   + ':00';

    this.bookingService.getOccupied(this.filterDate, start, end).subscribe({
      next:  (occupied) => this.loadSpaces(occupied, true),
      error: () => this.loadSpaces([], true)
    });
  }

  clearFilters(): void {
    this.filterType = '';
    this.filterDate = new Date().toISOString().split('T')[0];
    this.filterStartTime = '09:00';
    this.filterEndTime = '10:00';
    this.filterMinCapacity = null;
    this.searched.set(false);
    this.occupiedIds.set(new Set());
    this.loading.set(true);
    this.loadSpaces();
  }

  isOccupied(spaceId: string): boolean {
    return this.occupiedIds().has(spaceId);
  }

  openBooking(space: Resource): void {
    this.selectedSpace.set(space);
    this.bookingAttendees = 1;
    this.bookingNotes = '';
    this.bookingError.set('');
    this.bookingSuccess.set(false);
  }

  closeModal(): void {
    this.selectedSpace.set(null);
  }

  submitBooking(): void {
    const space = this.selectedSpace();
    if (!space) return;

    const request: BookingRequest = {
      spacePublicId: space.publicId,
      bookingDate: this.filterDate,
      startTime: this.filterStartTime + ':00',
      endTime: this.filterEndTime + ':00',
      attendees: this.bookingAttendees,
      notes: this.bookingNotes || undefined
    };

    this.bookingLoading.set(true);
    this.bookingError.set('');

    this.bookingService.create(request).subscribe({
      next: () => {
        this.bookingLoading.set(false);
        // Optimistic: mark the space as occupied right away, before the backend confirms
        this.occupiedIds.update(cur => { const s = new Set(cur); s.add(space.publicId); return s; });
        this.bookingSuccess.set(true);
        // La notificación llega vía SSE (booking_confirmed), no se duplica aquí
        setTimeout(() => { this.closeModal(); this.search(); }, 1800);
      },
      error: (err) => {
        this.bookingLoading.set(false);
        const msg = err?.error?.error || err?.error?.message;
        this.bookingError.set(msg || 'Error al crear la reserva. Verifica el horario.');
      }
    });
  }

  featureChips(features: Record<string, unknown>): string[] {
    const chips: string[] = [];
    if (features['has_projector']) chips.push('Proyector');
    if (features['has_ac']) chips.push('Aire acond.');
    if (features['whiteboard']) chips.push('Pizarrón');
    const monitors = features['monitors'];
    if (monitors && Number(monitors) > 0) chips.push(`${monitors} monitor(es)`);
    return chips;
  }
}

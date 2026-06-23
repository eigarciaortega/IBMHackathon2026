import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ResourceService } from '@core/services/resource';
import { BookingService } from '@core/services/booking';
import { NotificationService } from '@core/services/notification';
import { Resource, ResourceRequest, ResourceType } from '@core/models/space.model';
import { Booking } from '@core/models/booking.model';
import { AnalyticsDashboard } from '@core/models/analytics.model';

export type AdminTab = 'dashboard' | 'spaces' | 'bookings' | 'analytics';

@Component({
  selector: 'app-admin',
  imports: [FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit {
  private resourceService = inject(ResourceService);
  private bookingService = inject(BookingService);
  private notif = inject(NotificationService);

  activeTab = signal<AdminTab>('dashboard');
  todayDate = new Date().toISOString().split('T')[0];
  todayBookings = signal<Booking[]>([]);
  todayLoading = signal(false);

  // Spaces tab
  spaces = signal<Resource[]>([]);
  spacesLoading = signal(false);
  showSpaceForm = signal(false);
  editingSpace = signal<Resource | null>(null);

  spaceFormName = '';
  spaceFormType: ResourceType = 'ROOM';
  spaceFormCapacity = 1;
  spaceFormLocation = '';
  spaceHasProjector = false;
  spaceHasAC = false;
  spaceHasWhiteboard = false;
  spaceMonitors = 0;
  spaceFormLoading = signal(false);
  spaceFormError = signal('');
  importLoading = signal(false);

  // Bookings tab
  bookings = signal<Booking[]>([]);
  bookingsLoading = signal(false);
  cancellingBookingId = signal<string | null>(null);

  // Analytics tab
  analytics = signal<AnalyticsDashboard | null>(null);
  analyticsLoading = signal(false);

  ngOnInit(): void {
    this.loadSpaces();
    this.loadTodayBookings();
  }

  setTab(tab: AdminTab): void {
    this.activeTab.set(tab);
    if (tab === 'dashboard') this.loadTodayBookings();
    if (tab === 'bookings') this.loadBookings();
    if (tab === 'analytics') this.loadAnalytics();
  }

  loadTodayBookings(): void {
    this.todayLoading.set(true);
    forkJoin({
      bookings: this.bookingService.getDashboard(this.todayDate),
      spaces:   this.resourceService.getAll()
    }).subscribe({
      next: ({ bookings, spaces }) => {
        this.todayBookings.set(bookings);
        this.spaces.set(spaces);
        this.todayLoading.set(false);
      },
      error: () => this.todayLoading.set(false)
    });
  }

  // ---- Spaces ----

  loadSpaces(): void {
    this.spacesLoading.set(true);
    this.resourceService.getAll().subscribe({
      next: (s) => { this.spaces.set(s); this.spacesLoading.set(false); },
      error: () => this.spacesLoading.set(false)
    });
  }

  openAddSpace(): void {
    this.editingSpace.set(null);
    this.spaceFormName = '';
    this.spaceFormType = 'ROOM';
    this.spaceFormCapacity = 1;
    this.spaceFormLocation = '';
    this.spaceHasProjector = false;
    this.spaceHasAC = false;
    this.spaceHasWhiteboard = false;
    this.spaceMonitors = 0;
    this.spaceFormError.set('');
    this.showSpaceForm.set(true);
  }

  openEditSpace(space: Resource): void {
    this.editingSpace.set(space);
    this.spaceFormName = space.name;
    this.spaceFormType = space.type;
    this.spaceFormCapacity = space.capacity;
    this.spaceFormLocation = space.location;
    this.spaceHasProjector = !!space.features['has_projector'];
    this.spaceHasAC = !!space.features['has_ac'];
    this.spaceHasWhiteboard = !!space.features['whiteboard'];
    this.spaceMonitors = Number(space.features['monitors'] ?? 0);
    this.spaceFormError.set('');
    this.showSpaceForm.set(true);
  }

  closeSpaceForm(): void {
    this.showSpaceForm.set(false);
  }

  submitSpaceForm(): void {
    const features: Record<string, unknown> = {};
    if (this.spaceHasProjector) features['has_projector'] = true;
    if (this.spaceHasAC) features['has_ac'] = true;
    if (this.spaceHasWhiteboard) features['whiteboard'] = true;
    if (this.spaceMonitors > 0) features['monitors'] = this.spaceMonitors;

    const request: ResourceRequest = {
      name: this.spaceFormName,
      type: this.spaceFormType,
      capacity: this.spaceFormCapacity,
      location: this.spaceFormLocation,
      features
    };

    this.spaceFormLoading.set(true);
    this.spaceFormError.set('');

    const editing = this.editingSpace();
    const op = editing
      ? this.resourceService.update(editing.publicId, request)
      : this.resourceService.create(request);

    op.subscribe({
      next: () => {
        this.spaceFormLoading.set(false);
        this.showSpaceForm.set(false);
        this.notif.push(editing ? 'Espacio actualizado.' : 'Espacio creado.', 'success');
        this.loadSpaces();
      },
      error: (err) => {
        this.spaceFormLoading.set(false);
        this.spaceFormError.set(err?.error?.message || 'Error al guardar el espacio.');
      }
    });
  }

  deleteSpace(space: Resource): void {
    if (!confirm(`¿Eliminar el espacio "${space.name}"?`)) return;
    this.resourceService.delete(space.publicId).subscribe({
      next: () => {
        this.notif.push('Espacio eliminado.', 'info');
        this.loadSpaces();
      },
      error: () => this.notif.push('Error al eliminar el espacio.', 'warning')
    });
  }

  importExcel(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importLoading.set(true);
    this.resourceService.importExcel(file).subscribe({
      next: (imported) => {
        this.importLoading.set(false);
        this.notif.push(`${imported.length} espacio(s) importados exitosamente.`, 'success');
        this.loadSpaces();
      },
      error: () => {
        this.importLoading.set(false);
        this.notif.push('Error al importar el archivo. Verifica el formato.', 'warning');
      }
    });
    input.value = '';
  }

  // ---- Bookings ----

  loadBookings(): void {
    this.bookingsLoading.set(true);
    forkJoin({
      bookings: this.bookingService.getAllHistory(),
      spaces: this.resourceService.getAll()
    }).subscribe({
      next: ({ bookings, spaces }) => {
        this.bookings.set(bookings);
        this.spaces.set(spaces);
        this.bookingsLoading.set(false);
      },
      error: () => this.bookingsLoading.set(false)
    });
  }

  exportExcel(): void { this.bookingService.exportExcel(); }
  exportCsv(): void { this.bookingService.exportCsv(); }

  adminCancelBooking(booking: Booking): void {
    if (!confirm(`¿Cancelar la reserva de ${booking.userName || booking.userEmail || 'este usuario'} en ${this.spaceName(booking.spacePublicId)}?`)) return;
    this.cancellingBookingId.set(booking.publicId);
    this.bookingService.adminCancel(booking.publicId).subscribe({
      next: () => {
        this.cancellingBookingId.set(null);
        this.notif.push('Reserva cancelada por el administrador.', 'info');
        this.loadBookings();
      },
      error: () => {
        this.cancellingBookingId.set(null);
        this.notif.push('Error al cancelar la reserva.', 'warning');
      }
    });
  }

  // ---- Analytics ----

  loadAnalytics(): void {
    this.analyticsLoading.set(true);
    forkJoin({
      analytics: this.bookingService.getAnalytics(),
      spaces: this.resourceService.getAll()
    }).subscribe({
      next: ({ analytics, spaces }) => {
        this.analytics.set(analytics);
        this.spaces.set(spaces);
        this.analyticsLoading.set(false);
      },
      error: () => this.analyticsLoading.set(false)
    });
  }

  spaceName(publicId: string): string {
    return this.spaces().find(s => s.publicId === publicId)?.name ?? publicId.substring(0, 8) + '...';
  }

  maxPeakCount(): number {
    const a = this.analytics();
    if (!a || a.peakHours.length === 0) return 1;
    return Math.max(...a.peakHours.map(h => h.bookingCount));
  }

  maxDailyCount(): number {
    const a = this.analytics();
    if (!a || a.bookingsPerDay.length === 0) return 1;
    return Math.max(...a.bookingsPerDay.map(d => d.bookingCount));
  }

  // ---- Helpers ----

  formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  }

  formatTime(time: string): string {
    return time.substring(0, 5);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
      case 'RESERVED': return 'Reservada';
      case 'AVAILABLE':
      case 'CANCELLED': return 'Disponible';
      case 'COMPLETED': return 'Completada';
      default: return status;
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
      case 'RESERVED': return 'bg-blue-900 text-blue-300';
      case 'AVAILABLE':
      case 'CANCELLED': return 'bg-green-900 text-green-300';
      case 'COMPLETED': return 'bg-gray-700 text-gray-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  }
}

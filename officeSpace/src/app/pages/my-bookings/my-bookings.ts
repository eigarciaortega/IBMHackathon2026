import { Component, inject, signal, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { BookingService } from '@core/services/booking';
import { NotificationService } from '@core/services/notification';
import { ResourceService } from '@core/services/resource';
import { Resource } from '@core/models/space.model';
import { Booking } from '@core/models/booking.model';

@Component({
  selector: 'app-my-bookings',
  imports: [],
  templateUrl: './my-bookings.html',
  styleUrl: './my-bookings.css'
})
export class MyBookings implements OnInit {
  private bookingService = inject(BookingService);
  private resourceService = inject(ResourceService);
  private notif = inject(NotificationService);

  readonly todayDate = new Date().toISOString().split('T')[0];

  activeTab = signal<'active' | 'history'>('active');
  activeBookings = signal<Booking[]>([]);
  historyBookings = signal<Booking[]>([]);
  spaces = signal<Resource[]>([]);
  loading = signal(false);
  cancellingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.loading.set(true);
    forkJoin({
      active: this.bookingService.getMyBookings(),
      history: this.bookingService.getMyHistory(),
      spaces: this.resourceService.getAll()
    }).subscribe({
      next: ({ active, history, spaces }) => {
        // Sort ascending: closest date first
        const sorted = [...active].sort((a, b) =>
          a.bookingDate.localeCompare(b.bookingDate) || a.startTime.localeCompare(b.startTime)
        );
        this.activeBookings.set(sorted);
        this.historyBookings.set(history);
        this.spaces.set(spaces);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  spaceName(publicId: string): string {
    return this.spaces().find(s => s.publicId === publicId)?.name ?? '—';
  }

  bookingLabel(booking: Booking): string {
    if (booking.status !== 'ACTIVE') return this.statusLabel(booking.status);
    return 'Reservada';
  }

  bookingLabelClass(booking: Booking): string {
    if (booking.status !== 'ACTIVE') return this.statusClass(booking.status);
    return 'bg-blue-900 text-blue-300';
  }

  canCancel(booking: Booking): boolean {
    return booking.status === 'ACTIVE' && booking.bookingDate > this.todayDate;
  }

  cancel(publicId: string): void {
    if (!confirm('¿Cancelar esta reserva?')) return;
    this.cancellingId.set(publicId);
    this.bookingService.cancel(publicId).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.notif.push('Reserva cancelada.', 'warning');
        this.loadBookings();
      },
      error: () => {
        this.cancellingId.set(null);
        this.notif.push('Error al cancelar la reserva.', 'warning');
      }
    });
  }

  downloadIcal(publicId: string): void {
    this.bookingService.downloadIcal(publicId);
  }

  openGoogleCalendar(publicId: string): void {
    this.bookingService.getCalendarLinks(publicId).subscribe({
      next: (links) => window.open(links.googleCalendarUrl, '_blank')
    });
  }

  openOutlookCalendar(publicId: string): void {
    this.bookingService.getCalendarLinks(publicId).subscribe({
      next: (links) => window.open(links.outlookUrl, '_blank')
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  formatTime(time: string): string {
    return time.substring(0, 5);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Activa';
      case 'CANCELLED': return 'Cancelada';
      case 'COMPLETED': return 'Completada';
      default: return status;
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'bg-green-900 text-green-300';
      case 'CANCELLED': return 'bg-red-900 text-red-300';
      case 'COMPLETED': return 'bg-gray-700 text-gray-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  }
}

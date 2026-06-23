import { Component, OnInit } from '@angular/core';
import { Booking } from '../../../core/models/booking.model';
import { BookingsService } from '../../../core/services/bookings.service';
import { CalendarService } from '../../../core/services/calendar.service';

@Component({
  selector: 'app-my-bookings',
  templateUrl: './my-bookings.component.html',
  styleUrl: './my-bookings.component.scss',
})
export class MyBookingsComponent implements OnInit {
  loading = false;
  cancellingId: number | null = null;
  checkingInId: number | null = null;
  errorMsg = '';
  bookings: Booking[] = [];

  constructor(
    private bookingsService: BookingsService,
    private calendarService: CalendarService,
  ) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.loading = true;
    this.bookingsService.getMyBookings().subscribe({
      next: bookings => {
        this.bookings = bookings;
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar las reservas.';
        this.loading = false;
      },
    });
  }

  isFuture(date: string): boolean {
    return new Date(date) >= new Date(new Date().toDateString());
  }

  isCheckInWindow(b: Booking): boolean {
    if (b.status !== 'CONFIRMED') return false;
    const today = new Date().toISOString().split('T')[0];
    if (b.date !== today) return false;
    const now = Date.now();
    const start = new Date(`${b.date}T${b.startTime}:00`).getTime();
    return now >= start - 5 * 60_000 && now <= start + 15 * 60_000;
  }

  onCheckIn(id: number): void {
    this.checkingInId = id;
    this.bookingsService.checkIn(id).subscribe({
      next: updated => {
        this.bookings = this.bookings.map(b => b.id === id ? { ...b, status: updated.status, checkedInAt: updated.checkedInAt } : b);
        this.checkingInId = null;
      },
      error: err => {
        alert(err.error?.message ?? 'No se pudo realizar el check-in.');
        this.checkingInId = null;
      },
    });
  }

  onCancel(id: number): void {
    if (!confirm('¿Seguro que deseas cancelar esta reserva?')) return;
    this.cancellingId = id;
    this.bookingsService.cancel(id).subscribe({
      next: () => {
        this.bookings = this.bookings.filter(b => b.id !== id);
        this.cancellingId = null;
      },
      error: err => {
        alert(err.error?.message ?? 'No se pudo cancelar la reserva.');
        this.cancellingId = null;
      },
    });
  }

  addToGoogle(booking: Booking): void {
    this.calendarService.openGoogleCalendar(booking);
  }

  addToOutlook(booking: Booking): void {
    this.calendarService.openOutlookCalendar(booking);
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      CONFIRMED: 'Confirmada',
      CHECKED_IN: 'Check-in ✓',
      NO_SHOW: 'No se presentó',
      CANCELLED: 'Cancelada',
    };
    return labels[status] ?? status;
  }

  statusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      CONFIRMED: 'badge--blue',
      CHECKED_IN: 'badge--green',
      NO_SHOW: 'badge--red',
      CANCELLED: 'badge--gray',
    };
    return classes[status] ?? 'badge--gray';
  }
}

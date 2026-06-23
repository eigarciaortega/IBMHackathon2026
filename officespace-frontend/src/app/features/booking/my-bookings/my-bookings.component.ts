import { Component } from '@angular/core';
import { Booking } from '../../../core/models/booking.model';

@Component({
  selector: 'app-my-bookings',
  templateUrl: './my-bookings.component.html',
  styleUrl: './my-bookings.component.scss',
})
export class MyBookingsComponent {
  loading = false;
  cancellingId: number | null = null;

  // Mock data — reemplazar con BookingsService.getMyBookings()
  bookings: Booking[] = [
    {
      id: 1, spaceId: 1, spaceName: 'Sala Creativa',
      userId: 2, userName: 'Carlos Méndez',
      date: '2026-06-25', startTime: '09:00', endTime: '10:00',
      attendees: 5, status: 'CONFIRMED', createdAt: '2026-06-22T10:00:00Z',
    },
    {
      id: 2, spaceId: 4, spaceName: 'Escritorio Ventana A',
      userId: 2, userName: 'Carlos Méndez',
      date: '2026-06-26', startTime: '14:00', endTime: '17:00',
      attendees: 1, status: 'CONFIRMED', createdAt: '2026-06-22T11:00:00Z',
    },
    {
      id: 3, spaceId: 2, spaceName: 'Sala Ejecutiva',
      userId: 2, userName: 'Carlos Méndez',
      date: '2026-06-20', startTime: '10:00', endTime: '11:00',
      attendees: 8, status: 'CANCELLED', createdAt: '2026-06-18T09:00:00Z',
    },
  ];

  isFuture(date: string): boolean {
    return new Date(date) >= new Date(new Date().toDateString());
  }

  onCancel(id: number): void {
    if (!confirm('¿Seguro que deseas cancelar esta reserva?')) return;
    this.cancellingId = id;
    // TODO: this.bookingsService.cancel(id)
    setTimeout(() => {
      this.bookings = this.bookings.map(b =>
        b.id === id ? { ...b, status: 'CANCELLED' as const } : b
      );
      this.cancellingId = null;
    }, 600);
  }
}

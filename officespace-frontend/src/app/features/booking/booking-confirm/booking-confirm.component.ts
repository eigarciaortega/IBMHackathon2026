import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Space } from '../../../core/models/space.model';
import { Booking } from '../../../core/models/booking.model';
import { BookingsService } from '../../../core/services/bookings.service';
import { CalendarService } from '../../../core/services/calendar.service';

@Component({
  selector: 'app-booking-confirm',
  templateUrl: './booking-confirm.component.html',
  styleUrl: './booking-confirm.component.scss',
})
export class BookingConfirmComponent {
  form: FormGroup;
  loading = false;
  success = false;
  errorMsg = '';
  createdBooking: Booking | null = null;

  space: Space = history.state?.space ?? {
    id: 1, name: 'Sala Creativa', type: 'SALA', capacity: 8,
    floor: '2', hasProjector: true, hasAC: true,
  };
  filters = history.state?.filters ?? { date: '', startTime: '09:00', endTime: '10:00' };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private bookingsService: BookingsService,
    private calendarService: CalendarService,
  ) {
    this.form = this.fb.group({
      attendees: [1, [Validators.required, Validators.min(1), Validators.max(this.space.capacity)]],
    });
  }

  onConfirm(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMsg = '';

    this.bookingsService.create({
      spaceId: this.space.id,
      date: this.filters.date,
      startTime: this.filters.startTime,
      endTime: this.filters.endTime,
      attendees: this.form.value.attendees,
    }).subscribe({
      next: (booking) => {
        this.loading = false;
        this.success = true;
        this.createdBooking = booking;
      },
      error: err => {
        this.loading = false;
        if (err.status === 409) {
          this.errorMsg = 'El espacio ya está reservado en ese horario. Por favor elige otro horario o espacio.';
        } else if (err.status === 400) {
          this.errorMsg = err.error?.message ?? 'El número de asistentes supera la capacidad del espacio o la fecha es inválida.';
        } else if (err.status === 401) {
          this.errorMsg = 'Sesión expirada. Por favor inicia sesión de nuevo.';
          this.router.navigate(['/login']);
        } else {
          this.errorMsg = 'Error al crear la reserva. Por favor intenta de nuevo.';
        }
      },
    });
  }

  addToGoogle(): void {
    if (this.createdBooking) this.calendarService.openGoogleCalendar(this.createdBooking);
  }

  addToOutlook(): void {
    if (this.createdBooking) this.calendarService.openOutlookCalendar(this.createdBooking);
  }

  goToMyBookings(): void {
    this.router.navigate(['/booking/my-bookings']);
  }

  goToSearch(): void {
    this.router.navigate(['/search']);
  }
}

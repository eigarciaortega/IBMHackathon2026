import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Space } from '../../../core/models/space.model';

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

  // Datos que vienen desde SearchSpaces via router state
  space: Space = history.state?.space ?? {
    id: 1, name: 'Sala Creativa', type: 'SALA', capacity: 8,
    floor: '2', hasProjector: true, hasAC: true,
  };
  filters = history.state?.filters ?? { date: '', startTime: '09:00', endTime: '10:00' };

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      attendees: [1, [Validators.required, Validators.min(1), Validators.max(this.space.capacity)]],
    });
  }

  onConfirm(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMsg = '';
    // TODO: this.bookingsService.create({ spaceId, date, startTime, endTime, attendees })
    setTimeout(() => {
      this.loading = false;
      this.success = true;
    }, 800);
  }

  goToMyBookings(): void {
    this.router.navigate(['/booking/my-bookings']);
  }

  goToSearch(): void {
    this.router.navigate(['/search']);
  }
}

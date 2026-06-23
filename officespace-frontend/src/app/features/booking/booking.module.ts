import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { BookingRoutingModule } from './booking-routing.module';
import { BookingConfirmComponent } from './booking-confirm/booking-confirm.component';
import { MyBookingsComponent } from './my-bookings/my-bookings.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [BookingConfirmComponent, MyBookingsComponent],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SharedModule, BookingRoutingModule],
})
export class BookingModule {}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BookingConfirmComponent } from './booking-confirm/booking-confirm.component';
import { MyBookingsComponent } from './my-bookings/my-bookings.component';

const routes: Routes = [
  { path: 'confirm', component: BookingConfirmComponent },
  { path: 'my-bookings', component: MyBookingsComponent },
  { path: '', redirectTo: 'my-bookings', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BookingRoutingModule {}

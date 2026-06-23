import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Booking, BookingCreateRequest, DashboardStats } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private readonly BASE = environment.bookingApiUrl;

  constructor(private http: HttpClient) {}

  create(body: BookingCreateRequest): Observable<Booking> {
    return this.http.post<Booking>(`${this.BASE}/bookings`, body);
  }

  getMyBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.BASE}/bookings/my`);
  }

  cancel(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/bookings/${id}`);
  }

  getAllBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.BASE}/admin/bookings`);
  }

  getDashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.BASE}/admin/dashboard`);
  }
}

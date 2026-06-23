import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Booking, BookingRequest, CalendarLinks } from '@core/models/booking.model';
import { AnalyticsDashboard } from '@core/models/analytics.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private http = inject(HttpClient);

  private readonly API = 'http://localhost:8082/api/bookings';
  private readonly ANALYTICS_API = 'http://localhost:8082/api/analytics';

  create(request: BookingRequest): Observable<Booking> {
    return this.http.post<Booking>(this.API, request);
  }

  getMyBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.API}/my`);
  }

  getMyHistory(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.API}/my/history`);
  }

  cancel(publicId: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${publicId}`);
  }

  adminCancel(publicId: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/admin/${publicId}`);
  }

  getOccupied(date: string, startTime: string, endTime: string): Observable<string[]> {
    const params = new HttpParams()
      .set('date', date)
      .set('startTime', startTime)
      .set('endTime', endTime);
    return this.http.get<string[]>(`${this.API}/occupied`, { params });
  }

  getDashboard(date?: string): Observable<Booking[]> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http.get<Booking[]>(`${this.API}/dashboard`, { params });
  }

  getAllHistory(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.API}/history`);
  }

  getCalendarLinks(publicId: string): Observable<CalendarLinks> {
    return this.http.get<CalendarLinks>(`${this.API}/${publicId}/calendar-links`);
  }

  getAnalytics(): Observable<AnalyticsDashboard> {
    return this.http.get<AnalyticsDashboard>(`${this.ANALYTICS_API}/dashboard`);
  }

  downloadIcal(publicId: string): void {
    this.downloadBlob(`${this.API}/${publicId}/ical`, `booking-${publicId}.ics`);
  }

  exportExcel(from?: string, to?: string): void {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    this.downloadBlob(
      `${this.API}/export/excel`,
      `reservas-${new Date().toISOString().split('T')[0]}.xlsx`,
      params
    );
  }

  exportCsv(from?: string, to?: string): void {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    this.downloadBlob(
      `${this.API}/export/csv`,
      `reservas-${new Date().toISOString().split('T')[0]}.csv`,
      params
    );
  }

  // Uses HttpClient so the JWT interceptor adds the Authorization header
  private downloadBlob(url: string, filename: string, params?: HttpParams): void {
    this.http.get(url, { responseType: 'blob', params }).subscribe(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }
}

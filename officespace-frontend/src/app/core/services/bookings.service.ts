import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Booking, BookingCreateRequest, BookingSuggestion, DashboardStats } from '../models/booking.model';
import { Space, SpaceAvailabilityParams } from '../models/space.model';

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private readonly BASE = environment.bookingApiUrl;
  private readonly CATALOG = environment.catalogApiUrl;

  constructor(private http: HttpClient) {}

  // Busca espacios disponibles en booking-service: GET /bookings/spaces/available
  // Convierte date+HH:mm a ISO timestamp para el backend
  getAvailableSpaces(params: SpaceAvailabilityParams): Observable<Space[]> {
    const start = new Date(`${params.date}T${params.startTime}:00`).toISOString();
    const end = new Date(`${params.date}T${params.endTime}:00`).toISOString();

    let httpParams = new HttpParams().set('start', start).set('end', end);
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.minCapacity) httpParams = httpParams.set('minCapacity', params.minCapacity.toString());

    return this.http.get<any[]>(`${this.BASE}/bookings/spaces/available`, { params: httpParams }).pipe(
      map(list => list.map(s => this.mapSpace(s))),
      catchError(this.handleError)
    );
  }

  // POST /bookings — combina date+HH:mm → ISO y mapea spaceId → space_id
  create(body: BookingCreateRequest): Observable<Booking> {
    const payload = {
      space_id: body.spaceId,
      start_time: new Date(`${body.date}T${body.startTime}:00`).toISOString(),
      end_time: new Date(`${body.date}T${body.endTime}:00`).toISOString(),
      attendees: body.attendees,
    };
    return this.http.post<any>(`${this.BASE}/bookings`, payload).pipe(
      map(b => this.mapBooking(b)),
      catchError(this.handleError)
    );
  }

  // GET /bookings/my
  getMyBookings(): Observable<Booking[]> {
    return this.http.get<any[]>(`${this.BASE}/bookings/my`).pipe(
      map(list => list.map(b => this.mapBooking(b))),
      catchError(this.handleError)
    );
  }

  // GET /bookings (todas — para admin)
  getAllBookings(): Observable<Booking[]> {
    return this.http.get<any[]>(`${this.BASE}/bookings`).pipe(
      map(list => list.map(b => this.mapBooking(b))),
      catchError(this.handleError)
    );
  }

  // GET /bookings/today (reservas del día)
  getTodayBookings(): Observable<Booking[]> {
    return this.http.get<any[]>(`${this.BASE}/bookings/today`).pipe(
      map(list => list.map(b => this.mapBooking(b))),
      catchError(this.handleError)
    );
  }

  // DELETE /bookings/:id
  cancel(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.BASE}/bookings/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // POST /bookings/:id/checkin
  checkIn(id: number): Observable<Booking> {
    return this.http.post<any>(`${this.BASE}/bookings/${id}/checkin`, {}).pipe(
      map(b => this.mapBooking(b)),
      catchError(this.handleError)
    );
  }

  // GET /bookings/suggestions
  getSuggestions(): Observable<BookingSuggestion[]> {
    return this.http.get<BookingSuggestion[]>(`${this.BASE}/bookings/suggestions`).pipe(
      catchError(() => of([]))
    );
  }

  // GET /bookings/affected?spaceId=X — reservas futuras afectadas por mantenimiento
  getAffectedBookings(spaceId: number): Observable<Booking[]> {
    return this.http.get<any[]>(`${this.BASE}/bookings/affected`, { params: { spaceId: spaceId.toString() } }).pipe(
      map(list => list.map(b => this.mapBooking(b))),
      catchError(this.handleError)
    );
  }

  // GET /bookings/:id/alternatives — espacios disponibles para reubicar
  getAlternativesForBooking(bookingId: number): Observable<Space[]> {
    return this.http.get<any[]>(`${this.BASE}/bookings/${bookingId}/alternatives`).pipe(
      map(list => list.map(s => this.mapSpace(s))),
      catchError(() => of([]))
    );
  }

  // PATCH /bookings/:id/relocate — reasigna la reserva a otro espacio
  relocate(bookingId: number, newSpaceId: number): Observable<Booking> {
    return this.http.patch<any>(`${this.BASE}/bookings/${bookingId}/relocate`, { spaceId: newSpaceId }).pipe(
      map(b => this.mapBooking(b)),
      catchError(this.handleError)
    );
  }

  // Computa DashboardStats combinando booking-service y catalog-service
  getDashboard(): Observable<DashboardStats> {
    return forkJoin({
      spaces: this.http.get<any[]>(`${this.CATALOG}/spaces`),
      todayBookings: this.http.get<any[]>(`${this.BASE}/bookings/today`),
    }).pipe(
      map(({ spaces, todayBookings }) => {
        const totalSpaces = spaces.length;
        const occupiedIds = new Set(todayBookings.map((b: any) => b.space_id));
        const occupiedToday = occupiedIds.size;
        return {
          totalSpaces,
          occupiedToday,
          availableToday: totalSpaces - occupiedToday,
          bookingsToday: todayBookings.length,
          occupancyRate: totalSpaces > 0
            ? Math.round((occupiedToday / totalSpaces) * 100)
            : 0,
        };
      }),
      catchError(() => of({
        totalSpaces: 0, occupiedToday: 0, availableToday: 0,
        bookingsToday: 0, occupancyRate: 0,
      }))
    );
  }

  // Backend: {id, space_id, user_id, start_time, end_time, attendees, space:{...}}
  // Frontend: {id, spaceId, spaceName, userId, userName, date, startTime, endTime, ...}
  private mapBooking(raw: any): Booking {
    const start = new Date(raw.start_time);
    const end = new Date(raw.end_time);
    return {
      id: raw.id,
      spaceId: raw.space_id,
      spaceName: raw.space?.name ?? '',
      userId: raw.user_id,
      userName: raw.user?.email ?? '',
      date: start.toISOString().split('T')[0],
      startTime: start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
      endTime: end.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
      attendees: raw.attendees,
      status: raw.status ?? 'CONFIRMED',
      checkedInAt: raw.checked_in_at ?? null,
      createdAt: '',
    };
  }

  private mapSpace(raw: any): Space {
    return {
      id: raw.id,
      name: raw.name,
      type: raw.type,
      capacity: raw.capacity,
      floor: raw.location ?? '',
      hasProjector:  raw.resources?.projector          ?? false,
      hasAC:         raw.resources?.air_conditioning   ?? false,
      hasWhiteboard: raw.resources?.whiteboard         ?? false,
      hasTV:         raw.resources?.tv                 ?? false,
      hasVideoConf:  raw.resources?.video_conference   ?? false,
      isAvailable:        raw.available !== false,
      isUnderMaintenance: raw.is_under_maintenance ?? false,
      maintenanceUntil:   raw.maintenance_until    ?? null,
      maintenanceReason:  raw.maintenance_reason   ?? null,
    };
  }

  private handleError(err: any): Observable<never> {
    return throwError(() => err);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Space, SpaceAvailabilityParams, SpaceCreateRequest } from '../models/space.model';

@Injectable({ providedIn: 'root' })
export class SpacesService {
  private readonly BASE = environment.catalogApiUrl;

  constructor(private http: HttpClient) {}

  getAll(type?: string, minCapacity?: number): Observable<Space[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    if (minCapacity) params = params.set('minCapacity', minCapacity.toString());

    return this.http.get<any[]>(`${this.BASE}/spaces`, { params }).pipe(
      map(list => list.map(s => this.mapSpace(s))),
      catchError(this.handleError)
    );
  }

  getOne(id: number): Observable<Space> {
    return this.http.get<any>(`${this.BASE}/spaces/${id}`).pipe(
      map(s => this.mapSpace(s)),
      catchError(this.handleError)
    );
  }

  create(body: SpaceCreateRequest): Observable<Space> {
    return this.http.post<any>(`${this.BASE}/spaces`, this.toBackendDto(body)).pipe(
      map(s => this.mapSpace(s)),
      catchError(this.handleError)
    );
  }

  // Backend usa PATCH (no PUT)
  update(id: number, body: SpaceCreateRequest): Observable<Space> {
    return this.http.patch<any>(`${this.BASE}/spaces/${id}`, this.toBackendDto(body)).pipe(
      map(s => this.mapSpace(s)),
      catchError(this.handleError)
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/spaces/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  setMaintenance(id: number, until: string, reason: string): Observable<Space> {
    return this.http.patch<any>(`${this.BASE}/spaces/${id}/maintenance`, { until, reason }).pipe(
      map(s => this.mapSpace(s)),
      catchError(this.handleError)
    );
  }

  clearMaintenance(id: number): Observable<Space> {
    return this.http.delete<any>(`${this.BASE}/spaces/${id}/maintenance`).pipe(
      map(s => this.mapSpace(s)),
      catchError(this.handleError)
    );
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
      isAvailable: raw.available,
      isUnderMaintenance: raw.is_under_maintenance ?? false,
      maintenanceUntil:   raw.maintenance_until   ?? null,
      maintenanceReason:  raw.maintenance_reason  ?? null,
    };
  }

  private toBackendDto(body: SpaceCreateRequest): any {
    return {
      name: body.name,
      type: body.type,
      capacity: Number(body.capacity),
      location: body.floor,
      resources: {
        projector:        !!body.hasProjector,
        air_conditioning: !!body.hasAC,
        whiteboard:       !!body.hasWhiteboard,
        tv:               !!body.hasTV,
        video_conference: !!body.hasVideoConf,
      },
    };
  }

  private handleError(err: any): Observable<never> {
    return throwError(() => err);
  }
}

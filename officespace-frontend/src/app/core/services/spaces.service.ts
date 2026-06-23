import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Space, SpaceAvailabilityParams, SpaceCreateRequest } from '../models/space.model';

@Injectable({ providedIn: 'root' })
export class SpacesService {
  private readonly BASE = environment.catalogApiUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Space[]> {
    return this.http.get<Space[]>(`${this.BASE}/spaces`);
  }

  getAvailability(params: SpaceAvailabilityParams): Observable<Space[]> {
    let httpParams = new HttpParams()
      .set('date', params.date)
      .set('startTime', params.startTime)
      .set('endTime', params.endTime);

    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.minCapacity) httpParams = httpParams.set('minCapacity', params.minCapacity.toString());

    return this.http.get<Space[]>(`${this.BASE}/spaces/availability`, { params: httpParams });
  }

  create(body: SpaceCreateRequest): Observable<Space> {
    return this.http.post<Space>(`${this.BASE}/spaces`, body);
  }

  update(id: number, body: Partial<SpaceCreateRequest>): Observable<Space> {
    return this.http.put<Space>(`${this.BASE}/spaces/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/spaces/${id}`);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Resource, ResourceFilters, ResourceRequest } from '@core/models/space.model';

@Injectable({ providedIn: 'root' })
export class ResourceService {
  private http = inject(HttpClient);

  private readonly API = 'http://localhost:8081/api/resources';

  getAll(filters?: ResourceFilters): Observable<Resource[]> {
    let params = new HttpParams();
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.minCapacity != null) params = params.set('minCapacity', filters.minCapacity);
    return this.http.get<Resource[]>(this.API, { params });
  }

  getById(publicId: string): Observable<Resource> {
    return this.http.get<Resource>(`${this.API}/${publicId}`);
  }

  create(request: ResourceRequest): Observable<Resource> {
    return this.http.post<Resource>(this.API, request);
  }

  update(publicId: string, request: ResourceRequest): Observable<Resource> {
    return this.http.put<Resource>(`${this.API}/${publicId}`, request);
  }

  delete(publicId: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${publicId}`);
  }

  importExcel(file: File): Observable<Resource[]> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Resource[]>(`${this.API}/import`, formData);
  }
}

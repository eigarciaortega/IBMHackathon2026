import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AiSuggestion {
  spaceId: number;
  spaceName: string;
  suggestedDate: string;
  startTime: string;
  endTime: string;
  score: number;
  reason: string;
}

export interface NoShowPrediction {
  bookingId: number;
  probability: number;
  spaceName: string;
  time: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  // AI service no está implementado en el MVP — usar catalogApiUrl como fallback
  private readonly BASE = environment.catalogApiUrl;

  constructor(private http: HttpClient) {}

  getSuggestions(date?: string): Observable<AiSuggestion[]> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http.get<AiSuggestion[]>(`${this.BASE}/ai/suggest`, { params });
  }

  getNoShows(): Observable<NoShowPrediction[]> {
    return this.http.get<NoShowPrediction[]>(`${this.BASE}/ai/noshows`);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  TodayResponse,
  TypesResponse,
  StatsResponse,
  DetailResponse,
  DisclosureType,
} from '../types/disclosure.types';

@Injectable({ providedIn: 'root' })
export class DisclosureApiService {
  private baseUrl = `${environment.apiUrl}/disclosures`;

  constructor(private http: HttpClient) {}

  getToday(date?: string): Observable<TodayResponse> {
    const params = date ? { date } : {};
    return this.http.get<TodayResponse>(`${this.baseUrl}/today`, { params });
  }

  getTypes(): Observable<TypesResponse> {
    return this.http.get<TypesResponse>(`${this.baseUrl}/types`);
  }

  getStatsByType(type: DisclosureType): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.baseUrl}/stats/${type}`);
  }

  getDetail(id: string): Observable<DetailResponse> {
    return this.http.get<DetailResponse>(`${this.baseUrl}/${id}`);
  }
}

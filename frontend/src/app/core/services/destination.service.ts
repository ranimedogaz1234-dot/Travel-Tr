import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';
import { apiUrl } from '../config/api.config';
import {
  Destination,
  DestinationDetail,
  DestinationFilters,
  FilterOptions,
} from '../models/destination.model';

@Injectable({ providedIn: 'root' })
export class DestinationService {
  private readonly http = inject(HttpClient);
  private filterOptions$?: Observable<FilterOptions>;

  list(filters: DestinationFilters = {}): Observable<Destination[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http
      .get<{ destinations: Destination[] }>(apiUrl('/destinations'), { params })
      .pipe(map((res) => res.destinations));
  }

  getBySlug(slug: string): Observable<DestinationDetail> {
    return this.http
      .get<{ destination: DestinationDetail }>(apiUrl(`/destinations/${encodeURIComponent(slug)}`))
      .pipe(map((res) => res.destination));
  }

  /** Options de filtres (mises en cache pour la session). */
  getFilterOptions(): Observable<FilterOptions> {
    this.filterOptions$ ??= this.http
      .get<FilterOptions>(apiUrl('/destinations/filters'))
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.filterOptions$;
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';
import { apiUrl } from '../config/api.config';
import {
  BookingRules,
  CreateReservationPayload,
  Reservation,
  UpdateReservationPayload,
} from '../models/reservation.model';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly http = inject(HttpClient);
  private rules$?: Observable<BookingRules>;

  list(): Observable<Reservation[]> {
    return this.http
      .get<{ reservations: Reservation[] }>(apiUrl('/reservations'))
      .pipe(map((res) => res.reservations));
  }

  create(payload: CreateReservationPayload): Observable<Reservation> {
    return this.http
      .post<{ reservation: Reservation }>(apiUrl('/reservations'), payload)
      .pipe(map((res) => res.reservation));
  }

  update(id: number, payload: UpdateReservationPayload): Observable<Reservation> {
    return this.http
      .patch<{ reservation: Reservation }>(apiUrl(`/reservations/${id}`), payload)
      .pipe(map((res) => res.reservation));
  }

  cancel(id: number): Observable<Reservation> {
    return this.http
      .post<{ reservation: Reservation }>(apiUrl(`/reservations/${id}/cancel`), {})
      .pipe(map((res) => res.reservation));
  }

  getRules(): Observable<BookingRules> {
    this.rules$ ??= this.http
      .get<{ rules: BookingRules }>(apiUrl('/reservations/rules'))
      .pipe(
        map((res) => res.rules),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.rules$;
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { apiUrl } from '../config/api.config';
import { ContactPayload } from '../models/contact.model';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  send(payload: ContactPayload): Observable<string> {
    return this.http
      .post<{ message: string }>(apiUrl('/contact'), payload)
      .pipe(map((res) => res.message));
  }
}

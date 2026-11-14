import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';
import { ChangePasswordPayload, UpdateProfilePayload, User } from '../models/user.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  getProfile(): Observable<User> {
    return this.http.get<{ user: User }>(apiUrl('/users/me')).pipe(map((res) => res.user));
  }

  updateProfile(payload: UpdateProfilePayload): Observable<User> {
    return this.http.put<{ user: User }>(apiUrl('/users/me'), payload).pipe(
      map((res) => res.user),
      tap((user) => this.auth.setUser(user)),
    );
  }

  changePassword(payload: ChangePasswordPayload): Observable<string> {
    return this.http
      .put<{ message: string }>(apiUrl('/users/me/password'), payload)
      .pipe(map((res) => res.message));
  }
}

import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, firstValueFrom, map, Observable, of, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';
import { LoginPayload, RegisterPayload, User } from '../models/user.model';

interface UserResponse {
  user: User | null;
}

/**
 * État d'authentification côté client. La session réelle est gérée par le
 * serveur (cookie HttpOnly) : ce service ne stocke ni jeton ni mot de passe.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userSignal = signal<User | null>(null);

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  /** Appelé au démarrage : récupère la session existante (rafraîchissement de page). */
  restoreSession(): Promise<void> {
    return firstValueFrom(
      this.http.get<UserResponse>(apiUrl('/auth/me')).pipe(
        map((res) => this.userSignal.set(res.user)),
        catchError(() => {
          this.userSignal.set(null);
          return of(undefined);
        }),
      ),
    );
  }

  login(payload: LoginPayload): Observable<User> {
    return this.http.post<{ user: User }>(apiUrl('/auth/login'), payload).pipe(
      map((res) => res.user),
      tap((user) => this.userSignal.set(user)),
    );
  }

  register(payload: RegisterPayload): Observable<User> {
    return this.http.post<{ user: User }>(apiUrl('/auth/register'), payload).pipe(
      map((res) => res.user),
      tap((user) => this.userSignal.set(user)),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(apiUrl('/auth/logout'), {}).pipe(
      tap({ next: () => this.clear(), error: () => this.clear() }),
    );
  }

  /** Met à jour l'utilisateur affiché (après modification du profil). */
  setUser(user: User): void {
    this.userSignal.set(user);
  }

  /** Session expirée ou invalide côté serveur. */
  clear(): void {
    this.userSignal.set(null);
  }
}

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guards';

describe('Gardes de navigation', () => {
  let auth: AuthService;
  let router: Router;
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/mes-reservations' } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  const run = (guard: typeof authGuard) => TestBed.runInInjectionContext(() => guard(route, state));

  it('authGuard redirige un visiteur vers /connexion avec returnUrl', () => {
    const result = run(authGuard) as UrlTree;
    expect(router.serializeUrl(result)).toBe('/connexion?returnUrl=%2Fmes-reservations');
  });

  it('authGuard laisse passer un utilisateur connecté', () => {
    auth.setUser({ id: 1, fullName: 'A B', email: 'a@b.fr', phone: null, createdAt: '' });
    expect(run(authGuard)).toBe(true);
  });

  it('guestGuard renvoie un utilisateur connecté vers ses réservations', () => {
    expect(run(guestGuard)).toBe(true);
    auth.setUser({ id: 1, fullName: 'A B', email: 'a@b.fr', phone: null, createdAt: '' });
    expect(router.serializeUrl(run(guestGuard) as UrlTree)).toBe('/mes-reservations');
  });
});

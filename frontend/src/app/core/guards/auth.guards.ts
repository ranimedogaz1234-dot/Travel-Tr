import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Garde d'interface : redirige vers la connexion si l'utilisateur n'est pas
 * connecté. La vraie protection des données est assurée par l'API.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/connexion'], { queryParams: { returnUrl: state.url } });
};

/** Empêche un utilisateur connecté d'ouvrir les pages Connexion / Inscription. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/mes-reservations']) : true;
};

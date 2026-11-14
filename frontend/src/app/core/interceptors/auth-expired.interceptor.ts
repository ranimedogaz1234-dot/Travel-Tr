import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * Si l'API répond 401 alors que l'utilisateur pensait être connecté
 * (session expirée), on nettoie l'état local et on redirige vers la connexion.
 */
export const authExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isAuthCall = req.url.includes('/auth/');
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthCall && auth.isAuthenticated()) {
        auth.clear();
        toast.info('Votre session a expiré. Veuillez vous reconnecter.');
        void router.navigate(['/connexion'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    }),
  );
};

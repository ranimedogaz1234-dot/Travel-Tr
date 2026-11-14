import { config } from '../config.js';
import { HttpError } from '../utils/http-error.js';
import { randomToken, safeEqual } from '../utils/tokens.js';

export const CSRF_COOKIE = 'XSRF-TOKEN';
export const CSRF_HEADER = 'x-xsrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Protection CSRF par « double soumission » : un jeton aléatoire est déposé dans
 * un cookie lisible par Angular, qui le renvoie automatiquement dans l'en-tête
 * X-XSRF-TOKEN. Toute requête modifiante sans en-tête valide est refusée.
 * (Complète l'attribut SameSite=Lax du cookie de session.)
 */
export function csrfProtection(req, res, next) {
  let token = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = randomToken(24);
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: config.cookieSecure,
      path: '/',
    });
  }

  if (SAFE_METHODS.has(req.method)) return next();

  const header = req.get(CSRF_HEADER);
  if (!header || !req.cookies?.[CSRF_COOKIE] || !safeEqual(header, req.cookies[CSRF_COOKIE])) {
    return next(new HttpError(403, 'Requête refusée (jeton de sécurité invalide). Rechargez la page et réessayez.'));
  }
  next();
}

import { config } from '../config.js';
import { HttpError } from '../utils/http-error.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Point d’accès introuvable.' });
}

/** Gestionnaire d'erreurs final : jamais de trace de pile ni d'erreur SQL côté client. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details ? { fields: err.details } : {}) });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Corps de requête JSON invalide.' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Requête trop volumineuse.' });
  }
  if (!config.isTest) console.error('[erreur]', err);
  res.status(500).json({ error: 'Une erreur interne est survenue. Veuillez réessayer plus tard.' });
}

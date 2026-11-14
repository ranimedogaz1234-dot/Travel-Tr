/** Erreur HTTP contrôlée : son message est sûr à renvoyer au client. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const unauthorized = (message = 'Authentification requise.') => new HttpError(401, message);
export const notFound = (message = 'Ressource introuvable.') => new HttpError(404, message);
export const conflict = (message) => new HttpError(409, message);
export const unprocessable = (message) => new HttpError(422, message);

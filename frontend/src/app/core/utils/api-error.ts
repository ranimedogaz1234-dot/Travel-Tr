import { HttpErrorResponse } from '@angular/common/http';

export interface ApiError {
  message: string;
  fields: Record<string, string>;
  status: number;
}

/** Convertit une erreur HTTP en message français affichable. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { error?: string; fields?: Record<string, string> } | null;
    if (error.status === 0) {
      return {
        status: 0,
        message: 'Impossible de joindre le serveur. Vérifiez votre connexion ou que l’API est démarrée.',
        fields: {},
      };
    }
    return {
      status: error.status,
      message:
        typeof body?.error === 'string'
          ? body.error
          : 'Une erreur inattendue est survenue. Veuillez réessayer.',
      fields: body?.fields ?? {},
    };
  }
  return { status: -1, message: 'Une erreur inattendue est survenue. Veuillez réessayer.', fields: {} };
}

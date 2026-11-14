import { HttpErrorResponse } from '@angular/common/http';
import { toApiError } from './api-error';
import { safeReturnUrl } from './safe-redirect';

describe('safeReturnUrl', () => {
  it('accepte uniquement les chemins internes', () => {
    expect(safeReturnUrl('/mes-reservations')).toBe('/mes-reservations');
    expect(safeReturnUrl('/reservations?destination=kyoto')).toBe('/reservations?destination=kyoto');
  });

  it('refuse les redirections externes', () => {
    expect(safeReturnUrl('https://malveillant.example')).toBe('/');
    expect(safeReturnUrl('//malveillant.example')).toBe('/');
    expect(safeReturnUrl('/\\malveillant.example')).toBe('/');
    expect(safeReturnUrl(undefined, '/profil')).toBe('/profil');
  });
});

describe('toApiError', () => {
  it('reprend le message et les champs renvoyés par l’API', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { error: 'Certaines informations sont invalides.', fields: { email: 'Invalide.' } },
    });
    expect(toApiError(err)).toEqual({
      status: 400,
      message: 'Certaines informations sont invalides.',
      fields: { email: 'Invalide.' },
    });
  });

  it('explique une erreur réseau en français', () => {
    const err = new HttpErrorResponse({ status: 0 });
    expect(toApiError(err).message).toContain('Impossible de joindre le serveur');
  });
});

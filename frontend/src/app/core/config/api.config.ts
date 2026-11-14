/**
 * Base de l'API. Chemin relatif : en développement, le proxy Angular
 * (proxy.conf.json) redirige /api vers le backend ; en production, l'API sert
 * l'application sur la même origine. Aucun secret ne doit figurer ici :
 * tout ce qui est dans le frontend est public.
 */
export const API_BASE_URL = '/api';

export const apiUrl = (path: string): string => `${API_BASE_URL}${path}`;

/**
 * N'accepte qu'un chemin interne (« /… ») comme URL de retour, pour éviter les
 * redirections ouvertes vers un site externe (« //exemple.com », « https:… »).
 */
export function safeReturnUrl(value: string | null | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  return value;
}

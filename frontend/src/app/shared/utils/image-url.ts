/** Adapte la largeur demandée à une URL d'image Unsplash (paramètre « w »). */
export function resizeImage(url: string, width: number): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'images.unsplash.com') return url;
    parsed.searchParams.set('w', String(width));
    return parsed.toString();
  } catch {
    return url;
  }
}

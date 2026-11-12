/**
 * Vorschaubilder werden über den Bilddienst wsrv.nl (images.weserv.nl) verkleinert geladen.
 * Die Verlage liefern Originale mit bis zu 1 MB; angezeigt werden sie briefmarkengross.
 * Über VITE_IMAGE_PROXY lässt sich ein anderer, kompatibler Dienst setzen; «off» schaltet ihn ab.
 */
const configured = (import.meta.env?.VITE_IMAGE_PROXY as string | undefined)?.trim();
export const IMAGE_PROXY = configured === 'off' ? '' : configured || 'https://wsrv.nl/';

/**
 * Adresse einer verkleinerten Fassung (WebP, zugeschnitten). `width`/`height` in CSS-Pixeln;
 * angefordert wird die doppelte Auflösung für scharfe Darstellung auf HiDPI-Bildschirmen.
 * Liefert null, wenn kein Bilddienst konfiguriert ist oder die Adresse nicht passt.
 */
export function thumbUrl(src: string, width: number, height: number, proxy = IMAGE_PROXY): string | null {
  if (!proxy || !/^https?:\/\//i.test(src)) return null;
  const q = new URLSearchParams({
    url: src,
    w: String(width * 2),
    h: String(height * 2),
    fit: 'cover',
    output: 'webp',
    q: '70',
  });
  // «we»: kleine Originale nicht hochskalieren
  return `${proxy}?${q.toString()}&we`;
}

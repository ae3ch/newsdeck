import { usableImage } from './parseFeed';

const PRIORITY = ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'];

function attrOf(tag: string, name: string): string {
  const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return (m?.[1] ?? m?.[2] ?? m?.[3] ?? '').trim();
}

/** Sucht das Vorschaubild (og:image, sonst twitter:image) im HTML einer Artikelseite. */
export function extractOgImage(html: string, pageUrl: string): string | undefined {
  const found = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attrOf(tag, 'property') || attrOf(tag, 'name')).toLowerCase();
    if (!PRIORITY.includes(key) || found.has(key)) continue;
    const content = attrOf(tag, 'content');
    if (content) found.set(key, content);
  }
  for (const key of PRIORITY) {
    const raw = found.get(key);
    // usableImage dekodiert Entities, löst relative Pfade auf und lässt nur http(s) zu.
    const url = raw ? usableImage(raw, pageUrl) : undefined;
    if (url) return url;
  }
  return undefined;
}

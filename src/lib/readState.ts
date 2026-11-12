export const READ_KEY = 'tech-news:read';
/** So viele geöffnete Artikel bleiben vermerkt; ältere fallen heraus. */
export const MAX_READ = 2000;

/**
 * Kurze Prüfsumme einer Artikeladresse (FNV-1a, 32 Bit). Gespeichert wird sie statt der Adresse:
 * Das spart Platz, und im Speicher steht kein lesbarer Verlauf. Eine seltene Verwechslung zweier
 * Artikel hätte nur zur Folge, dass einer zu Unrecht abgeblendet erscheint.
 */
export function hashLink(link: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < link.length; i++) {
    h ^= link.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Hängt einen Eintrag hinten an. Liefert dieselbe Liste zurück, wenn er schon enthalten ist. */
export function addRead(list: string[], hash: string, max = MAX_READ): string[] {
  if (list.includes(hash)) return list;
  const next = [...list, hash];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** Liest die gespeicherte Liste; alles Unlesbare ergibt eine leere. */
export function parseRead(raw: string | null): string[] {
  try {
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter((x): x is string => typeof x === 'string').slice(-MAX_READ) : [];
  } catch {
    return [];
  }
}

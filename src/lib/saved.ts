import { isSafeLink } from './format';

export const SAVED_KEY = 'tech-news:saved';
/** So viele gemerkte Artikel bleiben erhalten; ältere fallen heraus. */
export const MAX_SAVED = 500;

/** Ein gemerkter Artikel. Er wird ganz gespeichert, weil er nach einiger Zeit aus dem Feed verschwindet. */
export interface SavedArticle {
  link: string;
  title: string;
  image?: string;
  pubDate: string | null;
  sourceId: string;
  sourceName: string;
  /** Zeitpunkt des Merkens (ms). */
  savedAt: number;
}

export const isSaved = (list: SavedArticle[], link: string): boolean => list.some((a) => a.link === link);

/** Merkt einen Artikel (neueste zuerst) oder entfernt ihn, wenn er schon gemerkt ist. */
export function toggleSaved(list: SavedArticle[], entry: SavedArticle, max = MAX_SAVED): SavedArticle[] {
  if (isSaved(list, entry.link)) return list.filter((a) => a.link !== entry.link);
  return [entry, ...list].slice(0, max);
}

const text = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, max) : null;

/** Liest die gespeicherte Liste; unbrauchbare Einträge und doppelte Links fallen weg. */
export function parseSaved(raw: string | null): SavedArticle[] {
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: SavedArticle[] = [];
  const seen = new Set<string>();
  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue;
    const e = item as Record<string, unknown>;
    const link = typeof e.link === 'string' && isSafeLink(e.link) ? e.link : null;
    const title = text(e.title, 500);
    const sourceName = text(e.sourceName, 80);
    if (!link || !title || !sourceName || seen.has(link)) continue;
    seen.add(link);
    out.push({
      link,
      title,
      ...(typeof e.image === 'string' && isSafeLink(e.image) ? { image: e.image } : {}),
      pubDate: typeof e.pubDate === 'string' ? e.pubDate : null,
      sourceId: text(e.sourceId, 40) ?? '',
      sourceName,
      savedAt: typeof e.savedAt === 'number' && Number.isFinite(e.savedAt) ? e.savedAt : 0,
    });
    if (out.length >= MAX_SAVED) break;
  }
  return out;
}

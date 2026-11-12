export const HEALTH_KEY = 'tech-news:health';
/** Ab dieser Dauer ununterbrochener Fehler gilt eine Quelle als defekt. */
export const BROKEN_AFTER = 24 * 3600_000;

/** Je Feed-Adresse: seit wann der Abruf ununterbrochen fehlschlägt, und der letzte Fehler. */
export type Health = Record<string, { since: number; error: string }>;

/**
 * Schreibt die Fehlerserien mit den Ergebnissen eines Abrufs fort. Ein Fehler beginnt eine Serie
 * oder setzt sie fort, ein Erfolg (auch «unverändert») beendet sie. Feeds, die in diesem Abruf
 * fehlen (etwa weil die ganze Anfrage scheiterte), bleiben unberührt.
 */
export function updateHealth(prev: Health, results: { feedUrl: string; error?: string }[], now: number): Health {
  let next = prev;
  for (const r of results) {
    const old = prev[r.feedUrl];
    if (r.error) {
      if (old && old.error === r.error) continue;
      next = next === prev ? { ...prev } : next;
      next[r.feedUrl] = { since: old?.since ?? now, error: r.error.slice(0, 200) };
    } else if (old) {
      next = next === prev ? { ...prev } : next;
      delete next[r.feedUrl];
    }
  }
  return next;
}

/** Nur Einträge der angegebenen Feeds behalten. */
export function pruneHealth(health: Health, feedUrls: string[]): Health {
  const keep = new Set(feedUrls);
  const out: Health = {};
  for (const [url, entry] of Object.entries(health)) if (keep.has(url)) out[url] = entry;
  return out;
}

/** Feeds, die seit mindestens `after` ms ununterbrochen nicht laden. */
export function brokenFeeds(health: Health, now: number, after = BROKEN_AFTER): Health {
  const out: Health = {};
  for (const [url, entry] of Object.entries(health)) if (now - entry.since >= after) out[url] = entry;
  return out;
}

export function parseHealth(raw: string | null): Health {
  try {
    const data: unknown = raw ? JSON.parse(raw) : {};
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {};
    const out: Health = {};
    for (const [url, v] of Object.entries(data as Record<string, unknown>)) {
      const e = v as { since?: unknown; error?: unknown } | null;
      if (e && typeof e.since === 'number' && typeof e.error === 'string') out[url] = { since: e.since, error: e.error };
    }
    return out;
  } catch {
    return {};
  }
}

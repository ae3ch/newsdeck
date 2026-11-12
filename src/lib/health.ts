export const HEALTH_KEY = 'tech-news:health';
/** After this long without a single success, a source counts as broken. */
export const BROKEN_AFTER = 24 * 3600_000;

/** Per feed address: since when fetching has failed without interruption, and the last error. */
export type Health = Record<string, { since: number; error: string }>;

/**
 * Updates the failure streaks with the results of one fetch. An error starts a streak or
 * continues it, a success (including «unchanged») ends it. Feeds missing from this fetch
 * (for example because the whole request failed) stay untouched.
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

/** Keep only entries of the given feeds. */
export function pruneHealth(health: Health, feedUrls: string[]): Health {
  const keep = new Set(feedUrls);
  const out: Health = {};
  for (const [url, entry] of Object.entries(health)) if (keep.has(url)) out[url] = entry;
  return out;
}

/** Feeds that have failed to load without interruption for at least `after` ms. */
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

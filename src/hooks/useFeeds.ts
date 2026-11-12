import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedResult } from '../../shared/types';
import { fetchFeeds } from '../lib/api';
import { coversAll, decidePoll, type Claim } from '../lib/polling';

export const REFRESH_INTERVAL = 60_000;
const CACHE_KEY = 'tech-news:feeds';

export type FeedMap = Record<string, FeedResult>;

export interface FeedsState {
  feeds: FeedMap;
  loading: boolean;
  error: string | null;
  /** Zeitpunkt der letzten erfolgreichen Aktualisierung (ms) oder null. */
  updatedAt: number | null;
  refresh: () => void;
}

// Der letzte Stand liegt im localStorage: Beim nächsten Besuch erscheint die Seite sofort,
// und vom Server werden nur Feeds übertragen, die sich seither geändert haben.
function readCache(): { feeds: FeedMap; at: number | null } {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as { feeds?: FeedMap; at?: number };
      if (data.feeds && typeof data.feeds === 'object') return { feeds: data.feeds, at: data.at ?? null };
    }
  } catch {
    // ohne Zwischenspeicher weiter
  }
  return { feeds: {}, at: null };
}

function writeCache(feeds: FeedMap, at: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ feeds, at }));
  } catch {
    // Speicher voll oder gesperrt: dann lieber keinen als einen veralteten Stand behalten
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // nichts zu tun
    }
  }
}

/** Nur Feeds der aktuell aktiven Quellen aufbewahren, damit der Speicher nicht wächst. */
function onlyActive(feeds: FeedMap, urls: string[]): FeedMap {
  const out: FeedMap = {};
  for (const u of urls) if (feeds[u]) out[u] = feeds[u];
  return out;
}

/** Neue Ergebnisse übernehmen; bei einem Fehler die zuletzt bekannten Artikel behalten. */
export function mergeFeeds(prev: FeedMap, incoming: FeedResult[]): FeedMap {
  const next: FeedMap = { ...prev };
  for (const feed of incoming) {
    const old = prev[feed.feedUrl];
    if (feed.unchanged) {
      // Server meldet «unverändert»: vorhandenen Stand behalten, einen alten Fehler löschen.
      if (old) next[feed.feedUrl] = old.error ? { ...old, error: undefined } : old;
      continue;
    }
    next[feed.feedUrl] =
      feed.error && old && old.articles.length > 0 ? { ...old, error: feed.error } : feed;
  }
  return next;
}

/** Beginn des letzten Abrufs irgendeines Tabs, siehe `src/lib/polling.ts`. */
const CLAIM_KEY = 'tech-news:feeds-claim';

function readClaim(): Claim | null {
  try {
    const raw = localStorage.getItem(CLAIM_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<Claim>;
    return typeof c.at === 'number' ? { at: c.at, failed: c.failed === true } : null;
  } catch {
    return null;
  }
}

function writeClaim(claim: Claim) {
  try {
    localStorage.setItem(CLAIM_KEY, JSON.stringify(claim));
  } catch {
    // ohne Abstimmung: dann ruft eben jeder Tab selbst ab
  }
}

/** Den eigenen Vermerk entfernen, wenn der Abruf abgebrochen wurde (Neuladen, Tab zu). */
function releaseClaim(at: number) {
  try {
    if (readClaim()?.at === at) localStorage.removeItem(CLAIM_KEY);
  } catch {
    // nichts zu tun
  }
}

/**
 * Lädt die Feeds und danach minütlich; pausiert, solange der Tab verborgen ist.
 * Mehrere Tabs und ein Neuladen innerhalb der Minute teilen sich einen Abruf (siehe polling.ts).
 */
export function useFeeds(urls: string[]): FeedsState {
  const key = urls.join('\n');
  const [initial] = useState(readCache);
  const [feeds, setFeeds] = useState<FeedMap>(initial.feeds);
  const [loading, setLoading] = useState(urls.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(initial.at);
  const refreshRef = useRef<() => void>(() => {});
  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;
  /** Zeitpunkt des Stands, der in diesem Tab angezeigt wird. */
  const shownAtRef = useRef<number | null>(initial.at);

  useEffect(() => {
    const list = key ? key.split('\n') : [];
    if (list.length === 0) {
      setLoading(false);
      setError(null);
      return;
    }

    let disposed = false;
    let ctrl: AbortController | null = null;
    let timer: number | undefined;
    /** Beginn des laufenden eigenen Abrufs, solange er unterwegs ist. */
    let inFlight: number | null = null;

    /** Den gemeinsamen Stand übernehmen, wenn er neuer ist als der angezeigte. */
    const adopt = (shared: { feeds: FeedMap; at: number | null }) => {
      if (shared.at === null || (shownAtRef.current !== null && shared.at <= shownAtRef.current)) return;
      shownAtRef.current = shared.at;
      setFeeds((prev) => ({ ...prev, ...shared.feeds }));
      setUpdatedAt(shared.at);
      setError(null);
    };

    const run = async () => {
      ctrl?.abort();
      const mine = (ctrl = new AbortController());
      const started = Date.now();
      inFlight = started;
      writeClaim({ at: started });
      setLoading(true);
      try {
        // Bekannte Versionen mitschicken; nur für Feeds, deren Artikel wirklich vorliegen.
        const versions: Record<string, string | undefined> = {};
        for (const u of list) {
          const f = feedsRef.current[u];
          if (f && !f.error && f.articles.length > 0) versions[u] = f.version;
        }
        const result = await fetchFeeds(list, mine.signal, versions);
        if (disposed || mine.signal.aborted) return;
        const at = Date.now();
        shownAtRef.current = at;
        setFeeds((prev) => {
          const next = mergeFeeds(prev, result.feeds);
          writeCache(onlyActive(next, list), at);
          return next;
        });
        setUpdatedAt(at);
        setError(result.partial ? 'Some sources could not be updated.' : null);
      } catch {
        if (disposed || mine.signal.aborted) return;
        writeClaim({ at: started, failed: true });
        const saved = Object.keys(feedsRef.current).length > 0;
        setError(
          navigator.onLine === false
            ? `Offline${saved ? ' · showing saved headlines' : ''}`
            : 'Update failed. Retrying in a minute.',
        );
      } finally {
        if (inFlight === started && !mine.signal.aborted) inFlight = null;
        if (!disposed && ctrl === mine) setLoading(false);
      }
    };

    const scheduleAt = (at: number) => {
      window.clearTimeout(timer);
      // Etwas Streuung, damit gleichzeitig fällige Tabs nicht exakt zusammen abrufen.
      const delay = Math.max(0, at - Date.now()) + Math.random() * 500;
      timer = window.setTimeout(tick, delay);
    };

    function tick() {
      if (disposed || document.hidden) return; // beim Sichtbarwerden geht es weiter
      const shared = readCache();
      const decision = decidePoll({
        now: Date.now(),
        sharedAt: shared.at,
        claim: readClaim(),
        covered: coversAll(shared.feeds, list),
        interval: REFRESH_INTERVAL,
      });
      if (decision.fetchNow) {
        void run();
        scheduleAt(Date.now() + REFRESH_INTERVAL);
      } else {
        adopt(shared);
        setLoading(false);
        scheduleAt(decision.nextAt);
      }
    }

    const onVisibility = () => {
      if (!document.hidden) tick();
    };

    // Ein anderer Tab hat neue Daten gespeichert: übernehmen und den eigenen Abruf verschieben.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CACHE_KEY || !e.newValue) return;
      const shared = readCache();
      if (!coversAll(shared.feeds, list)) return;
      adopt(shared);
      if (shared.at !== null) scheduleAt(shared.at + REFRESH_INTERVAL);
    };

    const refreshNow = () => {
      void run();
      scheduleAt(Date.now() + REFRESH_INTERVAL);
    };
    refreshRef.current = refreshNow;
    // Wird die Seite verlassen, während ein Abruf läuft, den Vermerk freigeben,
    // damit die neu geladene Seite nicht auf ein Ergebnis wartet, das nie kommt.
    const onPageHide = () => {
      if (inFlight !== null) releaseClaim(inFlight);
    };

    tick();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);
    window.addEventListener('pagehide', onPageHide);
    // Wieder im Netz: nicht die Minute bis zum nächsten Versuch abwarten.
    window.addEventListener('online', refreshNow);

    return () => {
      disposed = true;
      onPageHide();
      ctrl?.abort();
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('online', refreshNow);
      refreshRef.current = () => {};
    };
  }, [key]);

  const refresh = useCallback(() => refreshRef.current(), []);
  return { feeds, loading, error, updatedAt, refresh };
}

/** Liefert die aktuelle Zeit und aktualisiert sie regelmässig (für relative Zeitangaben). */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

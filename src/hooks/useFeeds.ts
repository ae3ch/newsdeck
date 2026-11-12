import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedResult } from '../../shared/types';
import { ApiError, fetchFeeds } from '../lib/api';
import { HEALTH_KEY, parseHealth, pruneHealth, updateHealth, type Health } from '../lib/health';
import { coversAll, decidePoll, type Claim } from '../lib/polling';

export const REFRESH_INTERVAL = 60_000;
const CACHE_KEY = 'tech-news:feeds';

export type FeedMap = Record<string, FeedResult>;

export interface FeedsState {
  feeds: FeedMap;
  loading: boolean;
  error: string | null;
  /** Time of the last successful refresh (ms), or null. */
  updatedAt: number | null;
  /** Per feed: since when it has failed to load without interruption (see src/lib/health.ts). */
  health: Health;
  refresh: () => void;
}

// The last state lives in localStorage: on the next visit the page appears at once,
// and the server only sends feeds that have changed since then.
function readCache(): { feeds: FeedMap; at: number | null } {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as { feeds?: FeedMap; at?: number };
      if (data.feeds && typeof data.feeds === 'object') return { feeds: data.feeds, at: data.at ?? null };
    }
  } catch {
    // carry on without the cache
  }
  return { feeds: {}, at: null };
}

function writeCache(feeds: FeedMap, at: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ feeds, at }));
  } catch {
    // storage full or blocked: better keep no state than an outdated one
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // nothing to do
    }
  }
}

function readHealth(): Health {
  try {
    return parseHealth(localStorage.getItem(HEALTH_KEY));
  } catch {
    return {};
  }
}

function writeHealth(health: Health) {
  try {
    localStorage.setItem(HEALTH_KEY, JSON.stringify(health));
  } catch {
    // without storage, the health of the sources is not tracked across visits
  }
}

/** Keep only feeds of the currently active sources, so storage does not grow. */
function onlyActive(feeds: FeedMap, urls: string[]): FeedMap {
  const out: FeedMap = {};
  for (const u of urls) if (feeds[u]) out[u] = feeds[u];
  return out;
}

/** Apply new results; on an error keep the last known articles. */
export function mergeFeeds(prev: FeedMap, incoming: FeedResult[]): FeedMap {
  const next: FeedMap = { ...prev };
  for (const feed of incoming) {
    const old = prev[feed.feedUrl];
    if (feed.unchanged) {
      // Server reports «unchanged»: keep the existing state, clear an old error.
      if (old) next[feed.feedUrl] = old.error ? { ...old, error: undefined } : old;
      continue;
    }
    next[feed.feedUrl] =
      feed.error && old && old.articles.length > 0 ? { ...old, error: feed.error } : feed;
  }
  return next;
}

/** Start of the last fetch of any tab, see `src/lib/polling.ts`. */
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
    // no coordination: then every tab simply fetches on its own
  }
}

/** Remove the own claim when the fetch was aborted (reload, tab closed). */
function releaseClaim(at: number) {
  try {
    if (readClaim()?.at === at) localStorage.removeItem(CLAIM_KEY);
  } catch {
    // nothing to do
  }
}

/**
 * Loads the feeds, then every minute; pauses while the tab is hidden.
 * Several tabs and a reload within the minute share one fetch (see polling.ts).
 */
export function useFeeds(urls: string[]): FeedsState {
  const key = urls.join('\n');
  const [initial] = useState(readCache);
  const [feeds, setFeeds] = useState<FeedMap>(initial.feeds);
  const [loading, setLoading] = useState(urls.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(initial.at);
  const [health, setHealth] = useState<Health>(readHealth);
  const refreshRef = useRef<() => void>(() => {});
  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;
  /** Time of the state shown in this tab. */
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
    /** Start of the own fetch in progress, while it is under way. */
    let inFlight: number | null = null;

    /** Apply the shared state when it is newer than the one shown. */
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
        // Send known versions along; only for feeds whose articles are actually present.
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
        // Start from the stored state: other tabs update it as well.
        const nextHealth = pruneHealth(updateHealth(readHealth(), result.feeds, at), list);
        writeHealth(nextHealth);
        setHealth(nextHealth);
        setError(result.partial ? 'Some sources could not be updated.' : null);
      } catch (err) {
        if (disposed || mine.signal.aborted) return;
        writeClaim({ at: started, failed: true });
        const saved = Object.keys(feedsRef.current).length > 0;
        const status = err instanceof ApiError ? err.status : 0;
        setError(
          navigator.onLine === false
            ? `Offline${saved ? ' · showing saved headlines' : ''}`
            : status === 429
              ? 'Too many requests from your network. Retrying in a minute.'
              : status === 403
                ? 'The server refused the request. Reload the page.'
                : 'Update failed. Retrying in a minute.',
        );
      } finally {
        if (inFlight === started && !mine.signal.aborted) inFlight = null;
        if (!disposed && ctrl === mine) setLoading(false);
      }
    };

    const scheduleAt = (at: number) => {
      window.clearTimeout(timer);
      // Some jitter, so tabs that are due at the same time do not fetch at exactly the same moment.
      const delay = Math.max(0, at - Date.now()) + Math.random() * 500;
      timer = window.setTimeout(tick, delay);
    };

    function tick() {
      if (disposed || document.hidden) return; // resumes when the tab becomes visible
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

    // Another tab stored new data: apply it and postpone the own fetch.
    const onStorage = (e: StorageEvent) => {
      if (e.key === HEALTH_KEY) setHealth(readHealth());
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
    // If the page is left while a fetch is running, release the claim,
    // so the reloaded page does not wait for a result that never comes.
    const onPageHide = () => {
      if (inFlight !== null) releaseClaim(inFlight);
    };

    tick();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);
    window.addEventListener('pagehide', onPageHide);
    // Back online: do not wait out the minute until the next attempt.
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
  return { feeds, loading, error, updatedAt, health, refresh };
}

/** Returns the current time and updates it regularly (for relative times). */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

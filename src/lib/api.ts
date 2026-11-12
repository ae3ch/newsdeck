import {
  FEEDS_PER_BATCH,
  MAX_OG_PER_REQUEST,
  type OgResponse,
  type DiscoverResponse,
  type FeedResult,
  type FeedsResponse,
} from '../../shared/types';

const REQUEST_TIMEOUT = 25_000;

/** Error of an API request with its HTTP status (0 = no response). */
export class ApiError extends Error {
  constructor(readonly status: number) {
    super(status ? `HTTP ${status}` : 'Network error');
  }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new ApiError(res.status);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface FeedsFetchResult {
  feeds: FeedResult[];
  /** true when at least one partial request failed. */
  partial: boolean;
}

/**
 * Fetches all feeds in batches. `versions` names, per feed, the version the browser already has;
 * unchanged feeds then come back without articles. Throws only when no partial request succeeds.
 */
export async function fetchFeeds(
  urls: string[],
  signal?: AbortSignal,
  versions: Record<string, string | undefined> = {},
): Promise<FeedsFetchResult> {
  const batches = chunk(urls, FEEDS_PER_BATCH);
  const settled = await Promise.allSettled(
    batches.map((batch) => {
      const qs = batch.map((u) => `u=${encodeURIComponent(u)}&v=${encodeURIComponent(versions[u] ?? '')}`).join('&');
      return getJson<FeedsResponse>(`/api/feeds?${qs}`, signal);
    }),
  );
  const feeds: FeedResult[] = [];
  let failed = 0;
  for (const r of settled) {
    if (r.status === 'fulfilled' && Array.isArray(r.value.feeds)) feeds.push(...r.value.feeds);
    else failed++;
  }
  if (failed === batches.length && batches.length > 0) {
    const first = settled.find((r) => r.status === 'rejected');
    throw first && first.reason instanceof ApiError ? first.reason : new ApiError(0);
  }
  return { feeds, partial: failed > 0 };
}

export async function discoverFeeds(url: string, signal?: AbortSignal): Promise<DiscoverResponse> {
  return getJson<DiscoverResponse>(`/api/discover?url=${encodeURIComponent(url)}`, signal);
}

/** Fetches the preview images (og:image) for up to MAX_OG_PER_REQUEST articles. */
export async function fetchOgImages(urls: string[], signal?: AbortSignal): Promise<Record<string, string | null>> {
  const qs = urls.slice(0, MAX_OG_PER_REQUEST).map((u) => `u=${encodeURIComponent(u)}`).join('&');
  const res = await getJson<OgResponse>(`/api/og?${qs}`, signal);
  return res.images ?? {};
}

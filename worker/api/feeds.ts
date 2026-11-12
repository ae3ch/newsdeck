import { MAX_FEEDS_PER_REQUEST, type FeedResult, type FeedsResponse } from '../../shared/types';
import type { Handler } from '../_lib/handler';
import { parseFeed } from '../_lib/parseFeed';
import { FetchError, safeFetch, validatePublicUrl } from '../_lib/safeFetch';

const OK_TTL = 60;
const ERROR_TTL = 30;
const FEED_ACCEPT = 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5';

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers },
  });

/** Synthetischer Cache-Schlüssel pro Feed; so teilen sich alle Besucher denselben Abruf. */
const cacheKey = (feedUrl: string) =>
  new Request(`https://feed-cache.newsdeck.invalid/v1?u=${encodeURIComponent(feedUrl)}`);

/** Kurze Prüfsumme über den Feed-Inhalt (SHA-1, 12 Hex-Zeichen). */
async function versionOf(feed: { title?: string; siteUrl?: string; articles: unknown[] }): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify([feed.title, feed.siteUrl, feed.articles]));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', data));
  return [...digest.subarray(0, 6)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Hat der Browser diese Version schon, wird nur ein Platzhalter statt der Artikel gesendet. */
function slim(result: FeedResult, known: string): FeedResult {
  if (!result.error && result.version && result.version === known) {
    return { feedUrl: result.feedUrl, version: result.version, unchanged: true, articles: [] };
  }
  return result;
}

async function loadFeed(
  raw: string,
  cache: Cache | undefined,
  waitUntil: (p: Promise<unknown>) => void,
): Promise<FeedResult> {
  let feedUrl: string;
  try {
    feedUrl = validatePublicUrl(raw).toString();
  } catch (err) {
    return { feedUrl: raw, articles: [], error: err instanceof FetchError ? err.message : 'Invalid URL' };
  }

  const key = cacheKey(feedUrl);
  try {
    const hit = await cache?.match(key);
    if (hit) return { ...((await hit.json()) as FeedResult), feedUrl: raw };
  } catch {
    // Cache nicht verfügbar: einfach frisch laden
  }

  let result: FeedResult;
  try {
    const { text, finalUrl } = await safeFetch(feedUrl, { accept: FEED_ACCEPT });
    const parsed = parseFeed(text, finalUrl);
    result = { feedUrl: raw, ...parsed, version: await versionOf(parsed) };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Feed could not be loaded';
    result = { feedUrl: raw, articles: [], error: message };
  }

  if (cache) {
    const ttl = result.error ? ERROR_TTL : OK_TTL;
    waitUntil(
      cache
        .put(key, json(result, 200, { 'Cache-Control': `public, max-age=${ttl}` }))
        .catch(() => {}),
    );
  }
  return result;
}

export const handleFeeds: Handler = async (request, waitUntil) => {
  // u = Feed-Adresse, v = dem Browser bekannte Version dieses Feeds (gleiche Position, optional).
  const params = new URL(request.url).searchParams;
  const versions = params.getAll('v');
  const known = new Map<string, string>();
  params.getAll('u').forEach((u, i) => {
    if (!known.has(u)) known.set(u, versions[i] ?? '');
  });
  const urls = [...known.keys()];
  if (urls.length === 0) return json({ error: 'Missing parameter u' }, 400);
  if (urls.length > MAX_FEEDS_PER_REQUEST) {
    return json({ error: `At most ${MAX_FEEDS_PER_REQUEST} feeds per request` }, 400);
  }

  let cache: Cache | undefined;
  try {
    cache = caches.default;
  } catch {
    cache = undefined;
  }

  const feeds = (await Promise.all(urls.map((u) => loadFeed(u, cache, waitUntil)))).map((f) =>
    slim(f, known.get(f.feedUrl) ?? ''),
  );
  const body: FeedsResponse = { fetchedAt: new Date().toISOString(), feeds };
  return json(body, 200, { 'Cache-Control': 'public, max-age=30' });
};

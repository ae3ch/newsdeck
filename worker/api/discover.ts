import type { DiscoverCandidate, DiscoverResponse } from '../../shared/types';
import type { Handler } from '../_lib/handler';
import { COMMON_FEED_PATHS, findFeedLinks } from '../_lib/discover';
import { looksLikeFeed, parseFeed } from '../_lib/parseFeed';
import { FetchError, safeFetch, validatePublicUrl } from '../_lib/safeFetch';

const MAX_CANDIDATES = 4;

const json = (body: DiscoverResponse, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=300',
    },
  });

function toCandidate(feedUrl: string, xml: string): DiscoverCandidate | undefined {
  try {
    const feed = parseFeed(xml, feedUrl);
    if (feed.articles.length === 0) return undefined;
    return {
      feedUrl,
      title: feed.title ?? new URL(feedUrl).hostname.replace(/^www\./, ''),
      siteUrl: feed.siteUrl,
      articleCount: feed.articles.length,
      sample: feed.articles.slice(0, 3).map((a) => a.title),
    };
  } catch {
    return undefined;
  }
}

async function probe(feedUrl: string): Promise<DiscoverCandidate | undefined> {
  try {
    const { text, finalUrl } = await safeFetch(feedUrl, { timeoutMs: 6000 });
    return looksLikeFeed(text) ? toCandidate(finalUrl, text) : undefined;
  } catch {
    return undefined;
  }
}

export const handleDiscover: Handler = async (request) => {
  const raw = new URL(request.url).searchParams.get('url') ?? '';
  let start: URL;
  try {
    start = validatePublicUrl(raw);
  } catch (err) {
    return json({ candidates: [], error: err instanceof FetchError ? err.message : 'Invalid URL' }, 400);
  }

  let page;
  try {
    page = await safeFetch(start.toString(), { maxBytes: 3_000_000 });
  } catch (err) {
    return json({ candidates: [], error: err instanceof FetchError ? err.message : 'Page unreachable' });
  }

  // Fall 1: Die Adresse ist bereits ein Feed.
  if (looksLikeFeed(page.text)) {
    const direct = toCandidate(page.finalUrl, page.text);
    if (direct) return json({ candidates: [direct] });
  }

  // Fall 2: Feed-Verweise im HTML, sonst übliche Pfade probieren.
  let urls = findFeedLinks(page.text, page.finalUrl).slice(0, MAX_CANDIDATES);
  if (urls.length === 0) {
    const origin = new URL(page.finalUrl).origin;
    urls = COMMON_FEED_PATHS.map((p) => origin + p);
  }

  const found = (await Promise.all(urls.map(probe))).filter((c): c is DiscoverCandidate => Boolean(c));
  const unique = found.filter((c, i) => found.findIndex((o) => o.feedUrl === c.feedUrl) === i);
  if (unique.length === 0) {
    return json({ candidates: [], error: 'No RSS or Atom feed was found on this page.' });
  }
  return json({ candidates: unique.slice(0, MAX_CANDIDATES) });
};

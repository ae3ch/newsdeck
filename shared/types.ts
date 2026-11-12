/** Types shared by the frontend and the worker. */

export interface Article {
  title: string;
  link: string;
  /** ISO 8601, or null when the feed has no readable date. */
  pubDate: string | null;
  /** Plain text, truncated. */
  description: string;
  image?: string;
}

export interface ParsedFeed {
  title?: string;
  siteUrl?: string;
  articles: Article[];
}

export interface FeedResult extends ParsedFeed {
  feedUrl: string;
  error?: string;
  /** Checksum of the content. The browser sends it along with the next request. */
  version?: string;
  /** true: the content matches the version sent along; `articles` is then empty and the browser keeps its state. */
  unchanged?: boolean;
}

export interface FeedsResponse {
  fetchedAt: string;
  feeds: FeedResult[];
}

export interface DiscoverCandidate {
  feedUrl: string;
  title: string;
  siteUrl?: string;
  articleCount: number;
  /** Up to three current headlines as a preview. */
  sample: string[];
}

export interface DiscoverResponse {
  candidates: DiscoverCandidate[];
  error?: string;
}

export interface OgResponse {
  /** Article URL → image URL, or null when the page has no preview image. */
  images: Record<string, string | null>;
}

/**
 * At most 24 feeds per request: Cloudflare's free plan allows 50 cache operations per request,
 * and every feed needs two (read, write).
 */
export const MAX_FEEDS_PER_REQUEST = 24;
/**
 * How many feeds the browser sends per request. This is fewer than allowed, because all feeds in one
 * request share the worker's CPU time (free plan: 10 ms, otherwise error 1102). The batches run in
 * parallel. MAX_FEEDS_PER_REQUEST stays higher so that older app versions still in a browser's
 * cache keep working.
 */
export const FEEDS_PER_BATCH = 6;
export const MAX_OG_PER_REQUEST = 8;

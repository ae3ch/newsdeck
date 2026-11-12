/** Typen, die Frontend und Pages Functions gemeinsam nutzen. */

export interface Article {
  title: string;
  link: string;
  /** ISO-8601 oder null, wenn der Feed kein lesbares Datum liefert. */
  pubDate: string | null;
  /** Reiner Text, gekürzt. */
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
  /** Prüfsumme des Inhalts. Der Browser schickt sie beim nächsten Abruf mit. */
  version?: string;
  /** true: Inhalt entspricht der mitgeschickten Version; `articles` ist dann leer und der Browser behält seinen Stand. */
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
  /** Bis zu drei aktuelle Schlagzeilen als Vorschau. */
  sample: string[];
}

export interface DiscoverResponse {
  candidates: DiscoverCandidate[];
  error?: string;
}

export interface OgResponse {
  /** Artikel-URL → Bild-URL, oder null, wenn die Seite kein Vorschaubild hat. */
  images: Record<string, string | null>;
}

/**
 * Höchstens 24 Feeds pro Aufruf: Im Gratis-Plan von Cloudflare sind pro Aufruf 50 Cache-Zugriffe
 * erlaubt, und jeder Feed braucht zwei (lesen, schreiben).
 */
export const MAX_FEEDS_PER_REQUEST = 24;
export const MAX_OG_PER_REQUEST = 8;

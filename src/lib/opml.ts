import { XMLParser } from 'fast-xml-parser';
import { categoryLabel } from '../data/defaultSources';
import { MAX_SOURCES, hostOf, isHttpUrl, isVisible, newSourceId, type DashboardConfig, type Source } from './config';

/**
 * OPML ist das Austauschformat der RSS-Reader. Dieses Modul wird erst geladen, wenn jemand
 * importiert oder exportiert (siehe CustomSources), damit der XML-Parser nicht im Startpaket landet.
 */

export interface OpmlFeed {
  title: string;
  feedUrl: string;
  siteUrl?: string;
}

export interface OpmlResult {
  config: DashboardConfig;
  /** Neu als eigene Quelle angelegt. */
  added: number;
  /** Bereits vorhanden, aber abgewählt; jetzt eingeschaltet. */
  enabled: number;
  /** Bereits vorhanden und aktiv. */
  present: number;
  /** Wegen der Höchstzahl an Quellen nicht übernommen. */
  skipped: number;
}

// Entities löst der Parser bewusst nicht auf (Schutz vor Entity-Expansion); decode() erledigt die üblichen.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: false,
  isArray: (name) => name === 'outline',
});

function decode(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (m, hex: string) => safeChar(parseInt(hex, 16), m))
    .replace(/&#(\d+);/g, (m, dec: string) => safeChar(parseInt(dec, 10), m))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function safeChar(code: number, fallback: string): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return fallback;
  }
}

const attr = (node: Record<string, unknown>, ...names: string[]): string | undefined => {
  for (const name of names) {
    const v = node[name];
    if (typeof v === 'string' && v.trim()) return decode(v.trim());
  }
  return undefined;
};

/** Normalisiert eine Feed-Adresse für den Vergleich (Gross/Klein im Host, Standardschreibweise). */
const sameFeed = (url: string): string => {
  try {
    return new URL(url).toString();
  } catch {
    return url;
  }
};

/** Liest alle Feeds aus einer OPML-Datei, beliebig tief verschachtelt. Wirft bei unlesbaren Dateien. */
export function parseOpml(text: string): OpmlFeed[] {
  if (/<!(DOCTYPE|ENTITY)/i.test(text)) throw new Error('The file contains unsupported XML declarations.');
  let doc: unknown;
  try {
    doc = parser.parse(text);
  } catch {
    throw new Error('The file is not valid OPML.');
  }
  const body = (doc as { opml?: { body?: { outline?: unknown[] } } })?.opml?.body;
  if (!body) throw new Error('The file is not valid OPML.');

  const feeds: OpmlFeed[] = [];
  const seen = new Set<string>();
  const walk = (outlines: unknown[] | undefined, depth: number) => {
    if (!outlines || depth > 10) return;
    for (const item of outlines) {
      if (typeof item !== 'object' || item === null) continue;
      const node = item as Record<string, unknown>;
      const feedUrl = attr(node, 'xmlUrl', 'xmlurl');
      if (feedUrl && isHttpUrl(feedUrl) && !seen.has(sameFeed(feedUrl))) {
        seen.add(sameFeed(feedUrl));
        const siteUrl = attr(node, 'htmlUrl', 'htmlurl');
        feeds.push({
          title: (attr(node, 'title', 'text') ?? hostOf(feedUrl)).slice(0, 80),
          feedUrl,
          ...(siteUrl && isHttpUrl(siteUrl) ? { siteUrl } : {}),
        });
      }
      walk(node.outline as unknown[] | undefined, depth + 1);
    }
  };
  walk(body.outline, 0);
  return feeds;
}

/** Übernimmt Feeds ins Layout: vorhandene einschalten, unbekannte als eigene Quellen vorn anfügen. */
export function mergeOpml(config: DashboardConfig, feeds: OpmlFeed[]): OpmlResult {
  const sources = config.sources.slice();
  const byFeed = new Map(sources.map((s, i) => [sameFeed(s.feedUrl), i]));
  const added: Source[] = [];
  let enabled = 0;
  let present = 0;
  let skipped = 0;
  for (const feed of feeds) {
    const i = byFeed.get(sameFeed(feed.feedUrl));
    if (i !== undefined) {
      // -1: in diesem Import schon angelegt.
      if (i < 0 || sources[i].enabled) present++;
      else {
        sources[i] = { ...sources[i], enabled: true };
        enabled++;
      }
      continue;
    }
    if (sources.length + added.length >= MAX_SOURCES) {
      skipped++;
      continue;
    }
    added.push({
      id: newSourceId(),
      name: feed.title || hostOf(feed.feedUrl) || 'Source',
      siteUrl: feed.siteUrl ?? new URL(feed.feedUrl).origin,
      feedUrl: feed.feedUrl,
      enabled: true,
      custom: true,
    });
    byFeed.set(sameFeed(feed.feedUrl), -1);
  }
  return { config: { ...config, sources: [...added, ...sources] }, added: added.length, enabled, present, skipped };
}

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** OPML 2.0 mit den aktiven Quellen, gruppiert nach Thema; eigene Quellen unter «Custom». */
export function toOpml(config: DashboardConfig, now = new Date()): string {
  const groups = new Map<string, Source[]>();
  for (const s of config.sources) {
    if (!s.enabled || !isVisible(s, config.settings)) continue;
    const label = s.custom ? 'Custom' : (categoryLabel(s.category) ?? 'Other');
    groups.set(label, [...(groups.get(label) ?? []), s]);
  }
  const line = (s: Source) =>
    `      <outline type="rss" text="${escapeXml(s.name)}" title="${escapeXml(s.name)}" xmlUrl="${escapeXml(s.feedUrl)}" htmlUrl="${escapeXml(s.siteUrl)}"/>`;
  const body = [...groups]
    .map(([label, list]) => `    <outline text="${escapeXml(label)}" title="${escapeXml(label)}">\n${list.map(line).join('\n')}\n    </outline>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Newsdeck feeds</title>
    <dateCreated>${now.toUTCString()}</dateCreated>
  </head>
  <body>
${body}
  </body>
</opml>
`;
}

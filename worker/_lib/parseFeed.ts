import { XMLParser } from 'fast-xml-parser';
import type { Article, ParsedFeed } from '../../shared/types';

export const MAX_ARTICLES = 20;
const MAX_DESCRIPTION = 300;

// Entities werden bewusst nicht vom XML-Parser aufgelöst (Schutz vor
// Entity-Expansion); der Text wird unten selbst dekodiert.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: false,
});

type Node = unknown;
type Obj = Record<string, Node>;

const isObj = (n: Node): n is Obj => typeof n === 'object' && n !== null && !Array.isArray(n);

function asArray(n: Node): Node[] {
  if (n === undefined || n === null) return [];
  return Array.isArray(n) ? n : [n];
}

/** Sammelt den Textinhalt eines Knotens (inkl. verschachtelter Elemente, z. B. XHTML in Atom). */
function flatText(n: Node, depth = 0): string {
  if (n === undefined || n === null || depth > 8) return '';
  if (typeof n === 'string') return n;
  if (typeof n === 'number' || typeof n === 'boolean') return String(n);
  if (Array.isArray(n)) return n.map((x) => flatText(x, depth + 1)).join(' ');
  if (isObj(n)) {
    return Object.entries(n)
      .filter(([k]) => !k.startsWith('@_'))
      .map(([, v]) => flatText(v, depth + 1))
      .join(' ');
  }
  return '';
}

const attr = (n: Node, name: string): string => {
  if (!isObj(n)) return '';
  const v = n[`@_${name}`];
  return typeof v === 'string' ? v : '';
};

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '',
  ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', sbquo: '‚',
  ldquo: '“', rdquo: '”', bdquo: '„', laquo: '«', raquo: '»',
  auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
  eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', aacute: 'á', acirc: 'â',
  ccedil: 'ç', ntilde: 'ñ', iacute: 'í', oacute: 'ó', uacute: 'ú',
  euro: '€', pound: '£', copy: '©', reg: '®', trade: '™', deg: '°',
  middot: '·', bull: '•', times: '×', rarr: '→', larr: '←',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z][a-z0-9]{1,10});/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return '';
      return String.fromCodePoint(code);
    }
    return NAMED[body] ?? NAMED[body.toLowerCase()] ?? whole;
  });
}

function stripHtml(s: string): string {
  return s
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
}

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Feed-Inhalt (HTML, einfach oder doppelt maskiert) zu reinem Text. */
export function toPlainText(raw: string): string {
  // Tags werden zu Leerzeichen; Leerzeichen vor Satzzeichen danach wieder entfernen.
  return collapse(decodeEntities(stripHtml(decodeEntities(raw)))).replace(/ ([.,;:!?])(?= |$)/g, '$1');
}

function cleanTitle(raw: string): string {
  const once = decodeEntities(raw);
  const twice = /&(#\d+|#x[0-9a-f]+|[a-z]+);/i.test(once) ? decodeEntities(once) : once;
  return collapse(twice.replace(/<\/?(b|i|em|strong|span|code|u|sup|sub)\b[^>]*>/gi, ''));
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:–-]+$/, '')}…`;
}

function toHttpUrl(raw: string, base?: string): string | undefined {
  const value = decodeEntities(raw).trim();
  if (!value) return undefined;
  try {
    const u = base ? new URL(value, base) : new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    if (u.username || u.password) return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

function toIsoDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

// Zählpixel und Platzhalter, die Feeds als «Bild» ausgeben (z. B. cpx.golem.de/cpx.php).
const BAD_IMAGE = /(1x1|pixel|spacer|tracking|analytics|feedburner|gravatar|\/emoji\/|blank\.gif|feeds\.feedblitz|\/avatar|\/\/cpx\.|\/cpx\.php|\/count\.gif|vgwort\.de)/i;

export function usableImage(raw: string, base?: string): string | undefined {
  const url = toHttpUrl(raw, base);
  if (!url) return undefined;
  let path: string;
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    return undefined;
  }
  if (/\.(svg|ico|mp4|m4v|mov|webm|mp3|m4a|pdf)$/.test(path)) return undefined;
  if (BAD_IMAGE.test(url)) return undefined;
  return url;
}

function mediaImage(item: Obj, base?: string): string | undefined {
  const groups = [item, ...asArray(item['media:group']).filter(isObj)];
  let best: { url: string; width: number } | undefined;
  for (const g of groups) {
    for (const m of [...asArray(g['media:content']), ...asArray(g['media:thumbnail'])]) {
      const type = attr(m, 'type');
      const medium = attr(m, 'medium');
      if ((type && !type.startsWith('image/')) || (medium && medium !== 'image')) continue;
      const url = usableImage(attr(m, 'url'), base);
      if (!url) continue;
      const width = Number(attr(m, 'width')) || 0;
      if (!best || width > best.width) best = { url, width };
    }
  }
  if (best) return best.url;
  for (const e of asArray(item.enclosure)) {
    if (attr(e, 'type').startsWith('image/')) {
      const url = usableImage(attr(e, 'url'), base);
      if (url) return url;
    }
  }
  // Atom: <link rel="enclosure" type="image/…">
  for (const l of asArray(item.link)) {
    if (attr(l, 'rel') === 'enclosure' && attr(l, 'type').startsWith('image/')) {
      const url = usableImage(attr(l, 'href'), base);
      if (url) return url;
    }
  }
  return undefined;
}

function inlineImage(htmlParts: string[], base?: string): string | undefined {
  for (const part of htmlParts) {
    if (!part) continue;
    const html = part.includes('<img') ? part : decodeEntities(part);
    const re = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    let tries = 0;
    while ((m = re.exec(html)) && tries++ < 5) {
      const url = usableImage(m[1], base);
      if (url) return url;
    }
  }
  return undefined;
}

function rssLink(item: Obj, base?: string): string | undefined {
  for (const l of asArray(item.link)) {
    const url = toHttpUrl(isObj(l) && attr(l, 'href') ? attr(l, 'href') : flatText(l), base);
    if (url) return url;
  }
  for (const g of asArray(item.guid)) {
    if (attr(g, 'isPermaLink') === 'false') continue;
    const url = toHttpUrl(flatText(g));
    if (url) return url;
  }
  return undefined;
}

function atomLink(entry: Obj, base?: string): string | undefined {
  const links = asArray(entry.link);
  const preferred =
    links.find((l) => attr(l, 'rel') === 'alternate') ??
    links.find((l) => isObj(l) && !attr(l, 'rel')) ??
    links.find((l) => typeof l === 'string');
  if (preferred === undefined) return undefined;
  return toHttpUrl(isObj(preferred) ? attr(preferred, 'href') : flatText(preferred), base);
}

function buildArticle(
  item: Obj,
  link: string | undefined,
  dateFields: string[],
  textFields: string[],
): Article | undefined {
  const title = cleanTitle(flatText(item.title));
  if (!link || !title) return undefined;
  const raws = textFields.map((f) => flatText(item[f]));
  const description = truncate(toPlainText(raws.find((r) => r.trim()) ?? ''), MAX_DESCRIPTION);
  let pubDate: string | null = null;
  for (const f of dateFields) {
    pubDate = toIsoDate(flatText(item[f]));
    if (pubDate) break;
  }
  const image = mediaImage(item, link) ?? inlineImage(raws, link);
  return { title: truncate(title, 300), link, pubDate, description, ...(image ? { image } : {}) };
}

function finish(title: string, siteUrl: string | undefined, articles: (Article | undefined)[]): ParsedFeed {
  const seen = new Set<string>();
  const out: Article[] = [];
  for (const a of articles) {
    if (!a || seen.has(a.link)) continue;
    seen.add(a.link);
    out.push(a);
    if (out.length >= MAX_ARTICLES) break;
  }
  return { title: truncate(cleanTitle(title), 120) || undefined, siteUrl, articles: out };
}

/** Parst RSS 2.0, RSS 1.0 (RDF) und Atom. Wirft einen Fehler, wenn das Dokument kein Feed ist. */
export function parseFeed(xml: string, feedUrl?: string): ParsedFeed {
  let doc: Obj;
  try {
    doc = parser.parse(xml) as Obj;
  } catch {
    throw new Error('Not a valid feed');
  }

  const rss = isObj(doc.rss) ? doc.rss : undefined;
  const rdf = isObj(doc['rdf:RDF']) ? doc['rdf:RDF'] : undefined;
  const atom = isObj(doc.feed) ? doc.feed : undefined;

  if (rss || rdf) {
    const channel = asArray((rss ?? rdf)!.channel).find(isObj);
    if (!channel) throw new Error('Not a valid feed');
    const items = (rss ? asArray(channel.item) : asArray(rdf!.item)).filter(isObj);
    const siteUrl = asArray(channel.link)
      .map((l) => toHttpUrl(flatText(l), feedUrl))
      .find(Boolean);
    return finish(
      flatText(channel.title),
      siteUrl,
      items
        .slice(0, MAX_ARTICLES * 2)
        .map((it) =>
          buildArticle(it, rssLink(it, siteUrl ?? feedUrl), ['pubDate', 'dc:date', 'date'], [
            'description',
            'content:encoded',
            'summary',
          ]),
        ),
    );
  }

  if (atom) {
    const entries = asArray(atom.entry).filter(isObj);
    const siteUrl = atomLink(atom, feedUrl);
    return finish(
      flatText(atom.title),
      siteUrl,
      entries
        .slice(0, MAX_ARTICLES * 2)
        .map((e) =>
          buildArticle(e, atomLink(e, siteUrl ?? feedUrl), ['published', 'updated', 'dc:date'], [
            'summary',
            'content',
            'media:description',
          ]),
        ),
    );
  }

  throw new Error('Not a valid feed');
}

/** Grober Test, ob ein Dokument wie ein Feed aussieht (für die Feed-Erkennung). */
export function looksLikeFeed(text: string): boolean {
  return /<(rss|feed|rdf:RDF)[\s>]/i.test(text.slice(0, 2000));
}

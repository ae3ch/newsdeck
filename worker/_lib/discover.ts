/** Finds feed links (<link rel="alternate" …>) in an HTML page. */
export function findFeedLinks(html: string, pageUrl: string): string[] {
  const out: string[] = [];
  const head = html.slice(0, 300_000);
  const tags = head.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const get = (name: string) =>
      new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
        .exec(tag)
        ?.slice(1)
        .find((v) => v !== undefined) ?? '';
    const rel = get('rel').toLowerCase();
    const type = get('type').toLowerCase();
    const href = get('href').replace(/&amp;/g, '&').trim();
    if (!href || !rel.split(/\s+/).includes('alternate')) continue;
    if (!/(rss|atom)\+xml|application\/feed\+json|text\/xml|application\/xml/.test(type)) continue;
    if (type.includes('json')) continue;
    try {
      const url = new URL(href, pageUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
      const s = url.toString();
      // Comment feeds are almost never what is meant.
      if (/\/comments\/feed|[?&]feed=comments/i.test(s)) continue;
      if (!out.includes(s)) out.push(s);
    } catch {
      // invalid link
    }
  }
  return out;
}

export const COMMON_FEED_PATHS = ['/feed', '/rss.xml', '/atom.xml', '/index.xml', '/rss', '/feed.xml'];

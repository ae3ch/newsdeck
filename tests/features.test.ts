import { describe, expect, it } from 'vitest';
import { isSameOrigin } from '../worker/_lib/origin';
import { normalizeConfig } from '../src/lib/config';
import { BROKEN_AFTER, brokenFeeds, parseHealth, pruneHealth, updateHealth } from '../src/lib/health';
import { MAX_MUTED, cleanMutedWords, makeMuteMatcher } from '../src/lib/mute';
import { mergeOpml, parseOpml, toOpml } from '../src/lib/opml';
import { MAX_SAVED, parseSaved, toggleSaved, type SavedArticle } from '../src/lib/saved';

const article = (n: number): SavedArticle => ({
  link: `https://news.example/${n}`,
  title: `Headline ${n}`,
  pubDate: null,
  sourceId: 'heise',
  sourceName: 'heise online',
  savedAt: n,
});

describe('reading list', () => {
  it('saves newest first, removes on the second call and limits the length', () => {
    let list = toggleSaved([], article(1));
    list = toggleSaved(list, article(2));
    expect(list.map((a) => a.savedAt)).toEqual([2, 1]);
    expect(toggleSaved(list, article(1)).map((a) => a.savedAt)).toEqual([2]);
    expect(toggleSaved([article(1), article(2)], article(3), 2).map((a) => a.savedAt)).toEqual([3, 1]);
  });

  it('reads only usable entries', () => {
    const raw = JSON.stringify([
      article(1),
      article(1),
      { ...article(2), link: 'javascript:alert(1)' },
      { ...article(3), image: 'data:x', title: '  Spaced   title ' },
      { link: 'https://x.example/', title: '' },
      null,
    ]);
    const list = parseSaved(raw);
    expect(list.map((a) => a.link)).toEqual(['https://news.example/1', 'https://news.example/3']);
    expect(list[1]).not.toHaveProperty('image');
    expect(list[1].title).toBe('Spaced title');
    expect(parseSaved('kaputt')).toEqual([]);
    expect(parseSaved(JSON.stringify(Array.from({ length: MAX_SAVED + 3 }, (_, i) => article(i))))).toHaveLength(MAX_SAVED);
  });
});

describe('keyword filter', () => {
  it('cleans up the word list', () => {
    expect(cleanMutedWords(['  Deal ', 'deal', '', 'Black   Friday', 42, 'x'.repeat(60)])).toEqual([
      'Deal',
      'Black Friday',
      'x'.repeat(40),
    ]);
    expect(cleanMutedWords('Deal')).toEqual([]);
    expect(cleanMutedWords(Array.from({ length: 80 }, (_, i) => `w${i}`))).toHaveLength(MAX_MUTED);
  });

  it('matches whole words and phrases, case-insensitive, including umlauts', () => {
    const muted = makeMuteMatcher(['AI', 'Black Friday', 'Ärger', 'C++'])!;
    expect(muted('New AI model released')).toBe(true);
    expect(muted('He said nothing')).toBe(false);
    expect(muted('ai: what changed')).toBe(true);
    expect(muted('Best BLACK  FRIDAY deals')).toBe(true);
    expect(muted('Blackfriday')).toBe(false);
    expect(muted('Viel ärger mit dem Update')).toBe(true);
    expect(muted('Verärgerte Nutzer')).toBe(false);
    expect(muted('Why C++ is back')).toBe(true);
    expect(makeMuteMatcher([])).toBeNull();
  });
});

describe('failing sources', () => {
  it('continues failure streaks and ends them on success', () => {
    let h = updateHealth({}, [{ feedUrl: 'a', error: 'HTTP 404' }, { feedUrl: 'b' }], 1000);
    expect(h).toEqual({ a: { since: 1000, error: 'HTTP 404' } });
    const same = updateHealth(h, [{ feedUrl: 'a', error: 'HTTP 404' }], 5000);
    expect(same).toBe(h);
    h = updateHealth(h, [{ feedUrl: 'a', error: 'HTTP 500' }], 6000);
    expect(h.a).toEqual({ since: 1000, error: 'HTTP 500' });
    expect(updateHealth(h, [{ feedUrl: 'a' }], 7000)).toEqual({});
    // If a feed is missing from the result (request failed), its state stays.
    expect(updateHealth(h, [{ feedUrl: 'b' }], 7000)).toBe(h);
  });

  it('reports only after a day and keeps only active feeds', () => {
    const h = { a: { since: 0, error: 'x' }, b: { since: BROKEN_AFTER, error: 'y' } };
    expect(Object.keys(brokenFeeds(h, BROKEN_AFTER + 1))).toEqual(['a']);
    expect(pruneHealth(h, ['b', 'c'])).toEqual({ b: h.b });
    expect(parseHealth(JSON.stringify({ a: h.a, bad: { since: 'x' } }))).toEqual({ a: h.a });
    expect(parseHealth('[]')).toEqual({});
  });
});

const OPML = `<?xml version="1.0"?>
<opml version="2.0"><head><title>Export</title></head><body>
  <outline text="Tech">
    <outline type="rss" text="Golem" xmlUrl="https://rss.golem.de/rss.php?feed=ATOM1.0" htmlUrl="https://www.golem.de/"/>
    <outline text="Nested"><outline type="rss" title="Mein &amp; Blog" xmlUrl="https://blog.example/feed.xml"/></outline>
  </outline>
  <outline type="rss" text="Bad" xmlUrl="javascript:alert(1)"/>
  <outline type="rss" text="Duplicate" xmlUrl="https://BLOG.example/feed.xml"/>
  <outline text="No feed here"/>
</body></opml>`;

describe('OPML', () => {
  it('reads nested feeds and drops invalid and duplicate ones', () => {
    const feeds = parseOpml(OPML);
    expect(feeds.map((f) => f.feedUrl)).toEqual(['https://rss.golem.de/rss.php?feed=ATOM1.0', 'https://blog.example/feed.xml']);
    expect(feeds[1].title).toBe('Mein & Blog');
    expect(feeds[0].siteUrl).toBe('https://www.golem.de/');
    expect(() => parseOpml('<html></html>')).toThrow();
    expect(() => parseOpml('<!DOCTYPE x [<!ENTITY a "b">]><opml><body/></opml>')).toThrow();
  });

  it('turns on catalog sources, adds unknown ones and respects the limit', () => {
    const cfg = normalizeConfig({ version: 2, sources: [{ id: 'golem', enabled: false }] });
    const golemFeed = cfg.sources.find((s) => s.id === 'golem')!.feedUrl;
    const res = mergeOpml(cfg, [
      { title: 'Golem', feedUrl: golemFeed },
      { title: 'Mein Blog', feedUrl: 'https://blog.example/feed.xml' },
      { title: 'Mein Blog', feedUrl: 'https://blog.example/feed.xml' },
    ]);
    expect(res).toMatchObject({ added: 1, enabled: 1, present: 1, skipped: 0 });
    expect(res.config.sources[0]).toMatchObject({ name: 'Mein Blog', custom: true, enabled: true, siteUrl: 'https://blog.example' });
    expect(res.config.sources.find((s) => s.id === 'golem')!.enabled).toBe(true);

    const many = Array.from({ length: 200 }, (_, i) => ({ title: `F${i}`, feedUrl: `https://f${i}.example/feed` }));
    const capped = mergeOpml(cfg, many);
    expect(capped.config.sources).toHaveLength(100);
    expect(capped.added + capped.skipped).toBe(200);
  });

  it('export → import yields the same active feeds', () => {
    const cfg = normalizeConfig({
      version: 2,
      sources: [{ id: 'c-1', name: 'A <b> & "c"', siteUrl: 'https://a.example/', feedUrl: 'https://a.example/feed?x=1&y=2' }],
    });
    const xml = toOpml(cfg, new Date(0));
    const active = cfg.sources.filter((s) => s.enabled).map((s) => s.feedUrl);
    const back = parseOpml(xml);
    expect(back.map((f) => f.feedUrl).sort()).toEqual([...active].sort());
    expect(back.find((f) => f.feedUrl.startsWith('https://a.example'))!.title).toBe('A <b> & "c"');
  });
});

describe('API protection', () => {
  const req = (headers: Record<string, string>) => new Request('https://deck.example/api/feeds', { headers });
  it('allows only requests from the own site', () => {
    expect(isSameOrigin(req({ 'Sec-Fetch-Site': 'same-origin' }))).toBe(true);
    expect(isSameOrigin(req({ 'Sec-Fetch-Site': 'cross-site', Referer: 'https://deck.example/' }))).toBe(false);
    expect(isSameOrigin(req({ 'Sec-Fetch-Site': 'none' }))).toBe(false);
    expect(isSameOrigin(req({ Referer: 'https://deck.example/#customize' }))).toBe(true);
    expect(isSameOrigin(req({ Referer: 'https://evil.example/' }))).toBe(false);
    expect(isSameOrigin(req({}))).toBe(false);
  });
});

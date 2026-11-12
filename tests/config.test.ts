import { deflateSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { CATEGORIES, DEFAULT_SOURCES } from '../src/data/defaultSources';
import {
  decodeInstallHash,
  decodeShareHash,
  defaultConfig,
  encodeInstallHash,
  encodeShareHash,
  exportConfig,
  importConfig,
  normalizeConfig,
  sameLayout,
  visibleSources,
} from '../src/lib/config';
import { chunk } from '../src/lib/api';
import { mergeFeeds } from '../src/hooks/useFeeds';
import { relativeTime } from '../src/lib/format';

const custom = { id: 'c-abc', name: 'Mein Blog', siteUrl: 'https://blog.example', feedUrl: 'https://blog.example/feed', enabled: true };

describe('configuration', () => {
  it('built-in sources have unique ids and feed URLs', () => {
    expect(new Set(DEFAULT_SOURCES.map((s) => s.id)).size).toBe(DEFAULT_SOURCES.length);
    expect(new Set(DEFAULT_SOURCES.map((s) => s.feedUrl)).size).toBe(DEFAULT_SOURCES.length);
  });

  it('keeps order and status and appends missing catalog sources at the end', () => {
    const cfg = normalizeConfig({ sources: [{ id: 'golem', enabled: false }, custom, { id: 'heise' }] });
    expect(cfg.sources.slice(0, 3).map((s) => s.id)).toEqual(['golem', 'c-abc', 'heise']);
    expect(cfg.sources[0]).toMatchObject({ enabled: false, custom: false, name: 'Golem.de' });
    expect(cfg.sources[1]).toMatchObject({ custom: true, name: 'Mein Blog' });
    expect(cfg.sources).toHaveLength(DEFAULT_SOURCES.length + 1);
    // appended sources: only the starter selection is active
    const added = new Map(cfg.sources.slice(3).map((s) => [s.id, s.enabled]));
    expect(added.get('techcrunch')).toBe(true);
    expect(added.get('krebs')).toBe(false);
  });

  it('drops invalid and duplicate entries', () => {
    const cfg = normalizeConfig({
      version: 2,
      sources: [
        custom,
        { ...custom, id: 'c-zwei' },
        { id: 'c-js', name: 'x', feedUrl: 'javascript:alert(1)' },
        { id: 'c-ftp', name: 'x', feedUrl: 'ftp://example.com/feed' },
        { id: 'heise' },
        { id: 'heise' },
        null,
        'text',
        { name: 'no feed' },
      ],
      settings: { theme: 'rosa', articlesPerCard: 999, showTopStories: 'ja' },
    });
    expect(cfg.sources.filter((s) => s.custom).map((s) => s.id)).toEqual(['c-abc']);
    expect(cfg.sources.filter((s) => s.id === 'heise')).toHaveLength(1);
    expect(cfg.settings).toEqual({
      theme: 'system',
      articlesPerCard: 20,
      showTopStories: true,
      showImages: true,
      languages: ['de', 'en'],
      mutedWords: [],
    });
  });

  it('does not overwrite built-in sources with foreign feed URLs', () => {
    const cfg = normalizeConfig({ sources: [{ id: 'heise', feedUrl: 'https://evil.example/feed', name: 'Fake' }] });
    expect(cfg.sources[0].feedUrl).toBe(DEFAULT_SOURCES.find((s) => s.id === 'heise')!.feedUrl);
  });

  it('rejects data without a source list', () => {
    expect(() => normalizeConfig(null)).toThrow();
    expect(() => normalizeConfig({})).toThrow();
    expect(() => importConfig('not json')).toThrow();
  });

  it('export → import and share links are lossless', () => {
    const cfg = normalizeConfig({
      version: 2,
      sources: [custom, { id: 'zdnet', enabled: false }, { id: 'heise' }],
      settings: { theme: 'dark', articlesPerCard: 12, showTopStories: false, languages: ['en'], mutedWords: ['Deal', ' deal '] },
    });
    expect(cfg.settings.articlesPerCard).toBe(12);
    expect(cfg.settings.mutedWords).toEqual(['Deal']);
    expect(importConfig(exportConfig(cfg))).toEqual(cfg);
    expect(decodeShareHash(encodeShareHash(cfg))).toEqual(cfg);
    expect(decodeShareHash('#etwas-anderes')).toBeNull();
    expect(decodeShareHash('#layout=%%%kaputt')).toBeNull();
  });

  it('version 1 layouts start with four articles per card', () => {
    const settings = { articlesPerCard: 8, theme: 'dark' };
    expect(normalizeConfig({ version: 1, sources: [], settings }).settings).toMatchObject({ articlesPerCard: 4, theme: 'dark' });
    expect(normalizeConfig({ sources: [], settings }).settings.articlesPerCard).toBe(4);
    expect(defaultConfig().settings.articlesPerCard).toBe(4);
  });

  it('home screen link carries sources, order and display', () => {
    const cfg = normalizeConfig({
      version: 2,
      sources: [{ id: 'krebs' }, { ...custom, enabled: false }, { id: 'heise', enabled: false }, { id: 'golem' }],
      settings: { theme: 'dark', articlesPerCard: 6, showImages: false, languages: ['de'] },
    });
    const hash = encodeInstallHash(cfg);
    const back = decodeInstallHash(hash)!;
    expect(back.settings).toEqual(cfg.settings);
    expect(back.sources.slice(0, 4)).toEqual(cfg.sources.slice(0, 4));
    // Deselected catalog sources do not travel along, but arrive again deselected.
    expect(new Map(back.sources.map((s) => [s.id, s.enabled]))).toEqual(new Map(cfg.sources.map((s) => [s.id, s.enabled])));
    expect(sameLayout(back, cfg)).toBe(true);

    const moved = { ...cfg, sources: [cfg.sources[3], ...cfg.sources.slice(0, 3), ...cfg.sources.slice(4)] };
    expect(sameLayout(moved, cfg)).toBe(false);
    expect(sameLayout({ ...cfg, settings: { ...cfg.settings, showImages: true } }, cfg)).toBe(false);
    expect(decodeInstallHash(encodeShareHash(cfg))).toBeNull();
    expect(decodeShareHash(hash)).toBeNull();
    expect(decodeInstallHash('#install=%%%kaputt')).toBeNull();
  });

  it('links stay short enough for a QR code', () => {
    // A QR code holds at most 2953 characters; it stays easy to read well below that.
    const base = 'https://newsdeck.example.workers.dev/';
    expect((base + encodeShareHash(defaultConfig())).length).toBeLessThan(500);
    const customs = Array.from({ length: 10 }, (_, i) => ({
      id: `c-abcd12${i}`,
      name: `Some Custom Blog ${i}`,
      siteUrl: `https://blog${i}.example.com/`,
      feedUrl: `https://blog${i}.example.com/feed.xml`,
    }));
    const big = normalizeConfig({ version: 2, sources: [...customs, ...DEFAULT_SOURCES.map((d) => ({ id: d.id }))] });
    for (const link of [encodeShareHash(big), encodeInstallHash(big)]) {
      expect((base + link).length).toBeLessThan(1500);
    }
    expect(sameLayout(decodeShareHash(encodeShareHash(big))!, big)).toBe(true);
  });

  it('reads uncompressed links from the first version and rejects oversized ones', () => {
    const b64url = (bytes: Uint8Array) =>
      btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const legacy = (prefix: string, data: unknown) => prefix + b64url(new TextEncoder().encode(JSON.stringify(data)));
    const data = { version: 2, sources: [custom, { id: 'heise' }], settings: { theme: 'dark' } };
    expect(decodeShareHash(legacy('#layout=', data))!.sources[0].name).toBe('Mein Blog');
    expect(decodeInstallHash(legacy('#install=', data))!.settings.theme).toBe('dark');
    // 1 MB of spaces, only a few hundred bytes compressed: is not unpacked.
    const bomb = '#layout=1.' + b64url(deflateSync(new Uint8Array(1_000_000).fill(32)));
    expect(bomb.length).toBeLessThan(5000);
    expect(decodeShareHash(bomb)).toBeNull();
  });

  it('catalog: every source belongs to a known category, every category has sources', () => {
    const ids = new Set(CATEGORIES.map((c) => c.id));
    expect(DEFAULT_SOURCES.filter((s) => !ids.has(s.category))).toEqual([]);
    for (const c of CATEGORIES) expect(DEFAULT_SOURCES.some((s) => s.category === c.id)).toBe(true);
    expect(DEFAULT_SOURCES.every((s) => /^https:\/\//.test(s.feedUrl) && /^https:\/\//.test(s.siteUrl))).toBe(true);
  });

  it('language selection: invalid values fall back to both languages, the order is fixed', () => {
    const lang = (languages: unknown) => normalizeConfig({ sources: [], settings: { languages } }).settings.languages;
    expect(lang(['en', 'de'])).toEqual(['de', 'en']);
    expect(lang(['en', 'en', 'fr'])).toEqual(['en']);
    expect(lang([])).toEqual(['de', 'en']);
    expect(lang('de')).toEqual(['de', 'en']);
    expect(lang(undefined)).toEqual(['de', 'en']);
  });

  it('language selection hides catalog sources in other languages, never custom sources', () => {
    const cfg = normalizeConfig({ sources: [custom], settings: { languages: ['de'] } });
    const shown = visibleSources(cfg);
    expect(shown.some((s) => s.id === 'heise')).toBe(true);
    expect(shown.some((s) => s.id === 'theverge')).toBe(false);
    expect(shown.some((s) => s.id === 'c-abc')).toBe(true);
    expect(shown.filter((s) => !s.custom).every((s) => s.lang === 'de')).toBe(true);
    // hidden does not mean deselected: the selection is kept
    expect(cfg.sources.find((s) => s.id === 'theverge')!.enabled).toBe(true);
    const en = visibleSources({ ...cfg, settings: { ...cfg.settings, languages: ['en'] } });
    expect(en.filter((s) => !s.custom).every((s) => s.lang === 'en')).toBe(true);
  });

  it('every topic has at most the matching sources in each language', () => {
    for (const lang of ['de', 'en'] as const) {
      const cfg = normalizeConfig({ sources: [], settings: { languages: [lang] } });
      expect(visibleSources(cfg).filter((s) => s.enabled).length).toBeGreaterThan(3);
    }
  });

  it('the default configuration is stable and enables only the starter selection', () => {
    const cfg = defaultConfig();
    expect(cfg.sources.filter((s) => s.enabled).map((s) => s.id)).toEqual(
      DEFAULT_SOURCES.filter((s) => s.starter).map((s) => s.id),
    );
    expect(normalizeConfig(defaultConfig())).toEqual(defaultConfig());
  });
});

describe('helpers', () => {
  it('splits into batches', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 15)).toEqual([]);
  });

  it('keeps old articles when a feed fails temporarily', () => {
    const article = { title: 't', link: 'https://e.com/1', pubDate: null, description: '' };
    const prev = { a: { feedUrl: 'a', articles: [article] } };
    const next = mergeFeeds(prev, [
      { feedUrl: 'a', articles: [], error: 'HTTP 500' },
      { feedUrl: 'b', articles: [], error: 'kaputt' },
    ]);
    expect(next.a).toEqual({ feedUrl: 'a', articles: [article], error: 'HTTP 500' });
    expect(next.b.error).toBe('kaputt');
    expect(mergeFeeds(next, [{ feedUrl: 'a', articles: [article] }]).a.error).toBeUndefined();
  });

  it('keeps the state when the server reports «unchanged»', () => {
    const article = { title: 't', link: 'https://e.com/1', pubDate: null, description: '' };
    const prev = {
      a: { feedUrl: 'a', articles: [article], version: 'v1' },
      b: { feedUrl: 'b', articles: [article], version: 'v1', error: 'HTTP 500' },
    };
    const next = mergeFeeds(prev, [
      { feedUrl: 'a', articles: [], version: 'v1', unchanged: true },
      { feedUrl: 'b', articles: [], version: 'v1', unchanged: true },
      { feedUrl: 'c', articles: [], version: 'v9', unchanged: true },
    ]);
    expect(next.a).toBe(prev.a);
    expect(next.b.articles).toEqual([article]);
    expect(next.b.error).toBeUndefined();
    expect(next.c).toBeUndefined();
  });

  it('formats relative times', () => {
    const now = Date.parse('2026-11-11T12:00:00Z');
    expect(relativeTime('2026-11-11T11:59:30Z', now)).toBe('just now');
    expect(relativeTime('2026-11-11T11:40:00Z', now)).toBe('20 min ago');
    expect(relativeTime('2026-11-11T07:00:00Z', now)).toBe('5 h ago');
    expect(relativeTime('2026-11-10T10:00:00Z', now)).toBe('yesterday');
    expect(relativeTime('2026-11-12T10:00:00Z', now)).toBe('just now');
    expect(relativeTime('2026-11-08T12:00:00Z', now)).toBe('3 days ago');
    expect(relativeTime('2026-10-01T12:00:00Z', now)).toBe('1 Oct 2026');
    expect(relativeTime(null, now)).toBe('');
    expect(relativeTime('quatsch', now)).toBe('');
  });
});

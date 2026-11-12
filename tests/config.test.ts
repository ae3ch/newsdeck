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

describe('Konfiguration', () => {
  it('Startquellen haben eindeutige ids und Feed-URLs', () => {
    expect(new Set(DEFAULT_SOURCES.map((s) => s.id)).size).toBe(DEFAULT_SOURCES.length);
    expect(new Set(DEFAULT_SOURCES.map((s) => s.feedUrl)).size).toBe(DEFAULT_SOURCES.length);
  });

  it('behält Reihenfolge und Status, ergänzt fehlende Katalogquellen hinten', () => {
    const cfg = normalizeConfig({ sources: [{ id: 'golem', enabled: false }, custom, { id: 'heise' }] });
    expect(cfg.sources.slice(0, 3).map((s) => s.id)).toEqual(['golem', 'c-abc', 'heise']);
    expect(cfg.sources[0]).toMatchObject({ enabled: false, custom: false, name: 'Golem.de' });
    expect(cfg.sources[1]).toMatchObject({ custom: true, name: 'Mein Blog' });
    expect(cfg.sources).toHaveLength(DEFAULT_SOURCES.length + 1);
    // nachgerückte Quellen: nur die Startauswahl ist aktiv
    const added = new Map(cfg.sources.slice(3).map((s) => [s.id, s.enabled]));
    expect(added.get('techcrunch')).toBe(true);
    expect(added.get('krebs')).toBe(false);
  });

  it('verwirft ungültige und doppelte Einträge', () => {
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
        { name: 'ohne feed' },
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
    });
  });

  it('überschreibt Startquellen nicht mit fremden Feed-URLs', () => {
    const cfg = normalizeConfig({ sources: [{ id: 'heise', feedUrl: 'https://evil.example/feed', name: 'Fake' }] });
    expect(cfg.sources[0].feedUrl).toBe(DEFAULT_SOURCES.find((s) => s.id === 'heise')!.feedUrl);
  });

  it('lehnt Daten ohne Quellenliste ab', () => {
    expect(() => normalizeConfig(null)).toThrow();
    expect(() => normalizeConfig({})).toThrow();
    expect(() => importConfig('kein json')).toThrow();
  });

  it('Export → Import und Share-Link sind verlustfrei', () => {
    const cfg = normalizeConfig({
      version: 2,
      sources: [custom, { id: 'zdnet', enabled: false }, { id: 'heise' }],
      settings: { theme: 'dark', articlesPerCard: 12, showTopStories: false, languages: ['en'] },
    });
    expect(cfg.settings.articlesPerCard).toBe(12);
    expect(importConfig(exportConfig(cfg))).toEqual(cfg);
    expect(decodeShareHash(encodeShareHash(cfg))).toEqual(cfg);
    expect(decodeShareHash('#etwas-anderes')).toBeNull();
    expect(decodeShareHash('#layout=%%%kaputt')).toBeNull();
  });

  it('Layouts der Version 1 starten mit vier Artikeln pro Karte', () => {
    const settings = { articlesPerCard: 8, theme: 'dark' };
    expect(normalizeConfig({ version: 1, sources: [], settings }).settings).toMatchObject({ articlesPerCard: 4, theme: 'dark' });
    expect(normalizeConfig({ sources: [], settings }).settings.articlesPerCard).toBe(4);
    expect(defaultConfig().settings.articlesPerCard).toBe(4);
  });

  it('Homescreen-Link trägt Quellen, Reihenfolge und Darstellung und bleibt kürzer als der Share-Link', () => {
    const cfg = normalizeConfig({
      version: 2,
      sources: [{ id: 'krebs' }, { ...custom, enabled: false }, { id: 'heise', enabled: false }, { id: 'golem' }],
      settings: { theme: 'dark', articlesPerCard: 6, showImages: false, languages: ['de'] },
    });
    const hash = encodeInstallHash(cfg);
    const back = decodeInstallHash(hash)!;
    expect(back.settings).toEqual(cfg.settings);
    expect(back.sources.slice(0, 4)).toEqual(cfg.sources.slice(0, 4));
    // Abgewählte Katalogquellen reisen nicht mit, kommen aber abgewählt wieder an.
    expect(new Map(back.sources.map((s) => [s.id, s.enabled]))).toEqual(new Map(cfg.sources.map((s) => [s.id, s.enabled])));
    expect(sameLayout(back, cfg)).toBe(true);
    expect(hash.length).toBeLessThan(encodeShareHash(cfg).length / 2);

    const moved = { ...cfg, sources: [cfg.sources[3], ...cfg.sources.slice(0, 3), ...cfg.sources.slice(4)] };
    expect(sameLayout(moved, cfg)).toBe(false);
    expect(sameLayout({ ...cfg, settings: { ...cfg.settings, showImages: true } }, cfg)).toBe(false);
    expect(decodeInstallHash(encodeShareHash(cfg))).toBeNull();
    expect(decodeShareHash(hash)).toBeNull();
    expect(decodeInstallHash('#install=%%%kaputt')).toBeNull();
  });

  it('Katalog: jede Quelle gehört zu einer bekannten Kategorie, jede Kategorie hat Quellen', () => {
    const ids = new Set(CATEGORIES.map((c) => c.id));
    expect(DEFAULT_SOURCES.filter((s) => !ids.has(s.category))).toEqual([]);
    for (const c of CATEGORIES) expect(DEFAULT_SOURCES.some((s) => s.category === c.id)).toBe(true);
    expect(DEFAULT_SOURCES.every((s) => /^https:\/\//.test(s.feedUrl) && /^https:\/\//.test(s.siteUrl))).toBe(true);
  });

  it('Sprachwahl: ungültige Angaben fallen auf beide Sprachen zurück, Reihenfolge ist fest', () => {
    const lang = (languages: unknown) => normalizeConfig({ sources: [], settings: { languages } }).settings.languages;
    expect(lang(['en', 'de'])).toEqual(['de', 'en']);
    expect(lang(['en', 'en', 'fr'])).toEqual(['en']);
    expect(lang([])).toEqual(['de', 'en']);
    expect(lang('de')).toEqual(['de', 'en']);
    expect(lang(undefined)).toEqual(['de', 'en']);
  });

  it('Sprachwahl blendet Katalogquellen anderer Sprachen aus, eigene Quellen nie', () => {
    const cfg = normalizeConfig({ sources: [custom], settings: { languages: ['de'] } });
    const shown = visibleSources(cfg);
    expect(shown.some((s) => s.id === 'heise')).toBe(true);
    expect(shown.some((s) => s.id === 'theverge')).toBe(false);
    expect(shown.some((s) => s.id === 'c-abc')).toBe(true);
    expect(shown.filter((s) => !s.custom).every((s) => s.lang === 'de')).toBe(true);
    // ausgeblendet heisst nicht abgewählt: die Auswahl bleibt erhalten
    expect(cfg.sources.find((s) => s.id === 'theverge')!.enabled).toBe(true);
    const en = visibleSources({ ...cfg, settings: { ...cfg.settings, languages: ['en'] } });
    expect(en.filter((s) => !s.custom).every((s) => s.lang === 'en')).toBe(true);
  });

  it('jedes Thema hat in jeder Sprache höchstens die passenden Quellen', () => {
    for (const lang of ['de', 'en'] as const) {
      const cfg = normalizeConfig({ sources: [], settings: { languages: [lang] } });
      expect(visibleSources(cfg).filter((s) => s.enabled).length).toBeGreaterThan(3);
    }
  });

  it('Standardkonfiguration ist stabil und aktiviert nur die Startauswahl', () => {
    const cfg = defaultConfig();
    expect(cfg.sources.filter((s) => s.enabled).map((s) => s.id)).toEqual(
      DEFAULT_SOURCES.filter((s) => s.starter).map((s) => s.id),
    );
    expect(normalizeConfig(defaultConfig())).toEqual(defaultConfig());
  });
});

describe('Hilfsfunktionen', () => {
  it('teilt in Pakete', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 15)).toEqual([]);
  });

  it('behält alte Artikel, wenn ein Feed vorübergehend ausfällt', () => {
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

  it('behält den Stand, wenn der Server «unverändert» meldet', () => {
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

  it('formatiert relative Zeiten', () => {
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

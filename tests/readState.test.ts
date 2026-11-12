import { describe, expect, it } from 'vitest';
import { normalizeConfig } from '../src/lib/config';
import { MAX_READ, addRead, hashLink, parseRead } from '../src/lib/readState';
import { CUSTOM_TOPIC, topicsOf } from '../src/lib/topics';

describe('Gelesen-Markierung', () => {
  it('Prüfsumme ist stabil, kurz und unterscheidet Adressen', () => {
    const a = hashLink('https://example.com/artikel-1');
    expect(a).toBe(hashLink('https://example.com/artikel-1'));
    expect(a).not.toBe(hashLink('https://example.com/artikel-2'));
    expect(a).toMatch(/^[0-9a-z]{1,7}$/);
    const many = new Set(Array.from({ length: 5000 }, (_, i) => hashLink(`https://example.com/news/${i}`)));
    expect(many.size).toBeGreaterThan(4990);
  });

  it('hängt neue Einträge an, lässt bekannte stehen und begrenzt die Länge', () => {
    const list = ['a', 'b'];
    expect(addRead(list, 'a')).toBe(list);
    expect(addRead(list, 'c')).toEqual(['a', 'b', 'c']);
    expect(addRead(['a', 'b', 'c'], 'd', 3)).toEqual(['b', 'c', 'd']);
  });

  it('liest nur gültige Listen', () => {
    expect(parseRead('["a","b"]')).toEqual(['a', 'b']);
    expect(parseRead('["a",1,null,"b"]')).toEqual(['a', 'b']);
    expect(parseRead(null)).toEqual([]);
    expect(parseRead('{"a":1}')).toEqual([]);
    expect(parseRead('kaputt')).toEqual([]);
    expect(parseRead(JSON.stringify(Array.from({ length: MAX_READ + 5 }, (_, i) => `h${i}`)))).toHaveLength(MAX_READ);
  });
});

describe('Themen-Filter', () => {
  it('nennt nur Themen mit Quellen, in Katalog-Reihenfolge, eigene Quellen zuletzt', () => {
    const cfg = normalizeConfig({
      version: 2,
      sources: [{ id: 'c-x', name: 'Blog', feedUrl: 'https://blog.example/feed' }, { id: 'krebs' }, { id: 'heise' }, { id: 'golem' }],
    });
    const topics = topicsOf(cfg.sources.slice(0, 4));
    expect(topics).toEqual([
      { id: 'general', label: 'General', count: 2 },
      { id: 'security', label: 'Security', count: 1 },
      { id: CUSTOM_TOPIC, label: 'Custom', count: 1 },
    ]);
    expect(topicsOf([])).toEqual([]);
  });
});

import { useEffect, useRef, useState } from 'react';
import { MAX_OG_PER_REQUEST } from '../../shared/types';
import { chunk, fetchOgImages } from '../lib/api';

const CACHE_KEY = 'tech-news:og';
const MAX_ENTRIES = 1500;
const NEGATIVE_TTL = 24 * 3600_000;
const PARALLEL = 2;

/** link → [Bild-URL oder '' (kein Bild), Zeitstempel] */
type Store = Record<string, [string, number]>;

function readStore(): Store {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const data = raw ? (JSON.parse(raw) as Store) : {};
    return typeof data === 'object' && data !== null ? data : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  try {
    let entries = Object.entries(store);
    if (entries.length > MAX_ENTRIES) {
      entries = entries.sort((a, b) => b[1][1] - a[1][1]).slice(0, MAX_ENTRIES);
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Speicher voll oder gesperrt: Bilder werden dann beim nächsten Besuch neu ermittelt
  }
}

/**
 * Ermittelt Vorschaubilder für Artikel, deren Feed kein Bild mitliefert.
 * Ergebnisse werden im Browser gemerkt, damit jede Seite nur einmal abgefragt wird.
 */
export function useOgImages(links: string[], enabled: boolean): Record<string, string> {
  const store = useRef<Store | null>(null);
  if (store.current === null) store.current = readStore();
  const inflight = useRef(new Set<string>());
  const [images, setImages] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [link, [image]] of Object.entries(store.current!)) if (image) out[link] = image;
    return out;
  });

  const key = enabled ? links.join('\n') : '';

  useEffect(() => {
    if (!key) return;
    const now = Date.now();
    const known = store.current!;
    const todo = key.split('\n').filter((link) => {
      if (inflight.current.has(link)) return false;
      const entry = known[link];
      if (!entry) return true;
      // Seiten ohne Bild nach einem Tag erneut versuchen.
      return entry[0] === '' && now - entry[1] > NEGATIVE_TTL;
    });
    if (todo.length === 0) return;

    todo.forEach((l) => inflight.current.add(l));
    const batches = chunk(todo, MAX_OG_PER_REQUEST);
    let next = 0;

    const worker = async () => {
      while (next < batches.length) {
        const batch = batches[next++];
        let result: Record<string, string | null> | null = null;
        try {
          result = await fetchOgImages(batch);
        } catch {
          result = null;
        }
        const at = Date.now();
        const found: Record<string, string> = {};
        for (const link of batch) {
          inflight.current.delete(link);
          // Bei Netzwerkfehlern nichts merken, damit es später erneut versucht wird.
          if (!result) continue;
          const image = result[link] ?? '';
          known[link] = [image, at];
          if (image) found[link] = image;
        }
        if (result) writeStore(known);
        if (Object.keys(found).length > 0) setImages((prev) => ({ ...prev, ...found }));
      }
    };
    for (let i = 0; i < PARALLEL; i++) void worker();
  }, [key]);

  return images;
}

import { CATEGORIES } from '../data/defaultSources';
import type { Source } from './config';

export interface Topic {
  id: string;
  label: string;
  /** Anzahl der Quellen in diesem Thema. */
  count: number;
}

/** Eigene Quellen haben kein Thema aus dem Katalog; sie bilden ein eigenes. */
export const CUSTOM_TOPIC = 'custom';

export const topicOf = (source: Source): string => source.category ?? CUSTOM_TOPIC;

/** Themen, zu denen es unter den Quellen mindestens eine gibt, in Katalog-Reihenfolge; eigene zuletzt. */
export function topicsOf(sources: Source[]): Topic[] {
  const counts = new Map<string, number>();
  for (const s of sources) counts.set(topicOf(s), (counts.get(topicOf(s)) ?? 0) + 1);
  return [...CATEGORIES, { id: CUSTOM_TOPIC, label: 'Custom' }]
    .filter((c) => counts.has(c.id))
    .map((c) => ({ id: c.id, label: c.label, count: counts.get(c.id)! }));
}

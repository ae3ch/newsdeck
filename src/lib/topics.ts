import { CATEGORIES } from '../data/defaultSources';
import type { Source } from './config';

export interface Topic {
  id: string;
  label: string;
  /** Number of sources in this topic. */
  count: number;
}

/** Custom sources have no topic from the catalog; they form their own. */
export const CUSTOM_TOPIC = 'custom';

export const topicOf = (source: Source): string => source.category ?? CUSTOM_TOPIC;

/** Topics that have at least one source, in catalog order; custom ones last. */
export function topicsOf(sources: Source[]): Topic[] {
  const counts = new Map<string, number>();
  for (const s of sources) counts.set(topicOf(s), (counts.get(topicOf(s)) ?? 0) + 1);
  return [...CATEGORIES, { id: CUSTOM_TOPIC, label: 'Custom' }]
    .filter((c) => counts.has(c.id))
    .map((c) => ({ id: c.id, label: c.label, count: counts.get(c.id)! }));
}

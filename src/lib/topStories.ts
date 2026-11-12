import type { Article } from '../../shared/types';
import type { Source } from './config';

export interface Story {
  article: Article;
  source: Source;
  /** Names of all sources covering the same topic (including its own). */
  coveredBy: string[];
}

interface Candidate {
  article: Article;
  source: Source;
  time: number;
  tokens: Set<string>;
}

interface Cluster {
  seed: Candidate;
  members: Candidate[];
  sources: Map<string, string>;
  newest: number;
}

const DAY = 24 * 3600_000;
const SIMILARITY = 0.35;
const MIN_SHARED = 2;
const MAX_FILL_PER_SOURCE = 2;

// Filler words (German and English) and typical headline phrases without topical meaning.
const STOPWORDS = new Set(
  `der die das den dem des ein eine einer eines einem einen und oder aber auch als auf aus bei bis durch für gegen
  hat hatte haben ist sind war wird werden wurde mit nach nicht noch nun nur ohne sich sie sein seine ihr ihre über um
  unter vom von vor was wie wir zum zur zwischen mehr neue neuer neues neuen jetzt bald soll sollen kann können künftig
  erste ersten laut wegen beim kommt gibt macht will dies diese dieser man wenn dass weil wieder schon sehr alle kein
  keine heute test tipps angebot anzeige deal update video podcast kommentar bericht
  the and for with from that this these those are was were has have had will would can could not but its into over
  after before about what when why how who you your our their his her they them than then now new more most just out
  off all any get gets got one two may says said say here there review hands best deal deals report amid via per let
  won too also still`.split(/\s+/),
);

export function tokenize(title: string): Set<string> {
  const out = new Set<string>();
  for (let t of title.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (t.length < 3 || STOPWORDS.has(t)) continue;
    // very rough normalization of plurals (agents → agent)
    if (t.length > 4 && t.endsWith('s')) t = t.slice(0, -1);
    out.add(t);
  }
  return out;
}

/**
 * Detects inflected and language variants of the same word (million/millionen, agent/agenten):
 * the shorter word is the start of the longer one and at most three characters shorter.
 */
function hasVariant(token: string, others: Set<string>): boolean {
  if (token.length < 5) return false;
  for (const o of others) {
    if (o.length < 5 || Math.abs(o.length - token.length) > 3) continue;
    if (o.startsWith(token) || token.startsWith(o)) return true;
  }
  return false;
}

/** Weighted similarity of two titles (0–1); rare words count more than common ones. */
function similarity(a: Set<string>, b: Set<string>, weight: (t: string) => number): number {
  let shared = 0;
  let sharedWeight = 0;
  let total = 0;
  for (const t of a) {
    const w = weight(t);
    total += w;
    if (b.has(t) || hasVariant(t, b)) {
      shared++;
      sharedWeight += w;
    }
  }
  for (const t of b) total += weight(t);
  if (shared < MIN_SHARED || total === 0) return 0;
  return (2 * sharedWeight) / total;
}

/**
 * Selects the top stories: first topics from the last 24 hours that several sources cover
 * (the more sources, the further up), then the newest stories.
 */
export function rankTopStories(
  items: { source: Source; articles: Article[] | undefined }[],
  now: number,
  count: number,
): Story[] {
  const candidates: Candidate[] = [];
  for (const { source, articles } of items) {
    for (const article of articles ?? []) {
      const time = article.pubDate ? Date.parse(article.pubDate) : NaN;
      if (Number.isNaN(time) || time < now - DAY || time > now + 3600_000) continue;
      candidates.push({ article, source, time, tokens: tokenize(article.title) });
    }
  }
  candidates.sort((a, b) => b.time - a.time);

  const frequency = new Map<string, number>();
  for (const c of candidates) for (const t of c.tokens) frequency.set(t, (frequency.get(t) ?? 0) + 1);
  const weight = (t: string) => Math.log(1 + candidates.length / (frequency.get(t) ?? 1));

  // Each story is compared with the first story of a topic (not with all of them),
  // so topics do not chain together through intermediate stories into a catch-all.
  const clusters: Cluster[] = [];
  for (const c of candidates) {
    let best: Cluster | undefined;
    let bestScore = SIMILARITY;
    for (const cluster of clusters) {
      const score = similarity(c.tokens, cluster.seed.tokens, weight);
      if (score >= bestScore) {
        best = cluster;
        bestScore = score;
      }
    }
    if (best) {
      best.members.push(c);
      best.sources.set(c.source.id, c.source.name);
    } else {
      clusters.push({ seed: c, members: [c], sources: new Map([[c.source.id, c.source.name]]), newest: c.time });
    }
  }

  const stories: Story[] = [];
  const used = new Set<string>();
  const add = (c: Candidate, coveredBy: string[]) => {
    if (used.has(c.article.link) || stories.length >= count) return false;
    used.add(c.article.link);
    stories.push({ article: c.article, source: c.source, coveredBy });
    return true;
  };

  const shared = clusters
    .filter((cl) => cl.sources.size >= 2)
    .sort((a, b) => b.sources.size - a.sources.size || b.newest - a.newest);
  for (const cluster of shared) {
    // As the lead story, the newest story with an image, otherwise the newest overall.
    const lead = cluster.members.find((m) => m.article.image) ?? cluster.members[0];
    for (const m of cluster.members) used.add(m.article.link);
    used.delete(lead.article.link);
    add(lead, [...cluster.sources.values()]);
  }

  // Fill up with the newest stories, so no single source dominates the area.
  const perSource = new Map<string, number>();
  for (const c of candidates) {
    if (stories.length >= count) break;
    const n = perSource.get(c.source.id) ?? 0;
    if (n >= MAX_FILL_PER_SOURCE) continue;
    if (add(c, [c.source.name])) perSource.set(c.source.id, n + 1);
  }
  return stories;
}

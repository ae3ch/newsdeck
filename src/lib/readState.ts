export const READ_KEY = 'tech-news:read';
/** This many opened articles stay recorded; older ones drop out. */
export const MAX_READ = 2000;

/**
 * Short checksum of an article address (FNV-1a, 32 bit). It is stored instead of the address:
 * that saves space, and storage holds no readable history. A rare mix-up of two articles
 * would only mean that one appears dimmed although it was not opened.
 */
export function hashLink(link: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < link.length; i++) {
    h ^= link.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Appends an entry at the end. Returns the same list if it is already included. */
export function addRead(list: string[], hash: string, max = MAX_READ): string[] {
  if (list.includes(hash)) return list;
  const next = [...list, hash];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** Reads the stored list; anything unreadable results in an empty one. */
export function parseRead(raw: string | null): string[] {
  try {
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter((x): x is string => typeof x === 'string').slice(-MAX_READ) : [];
  } catch {
    return [];
  }
}

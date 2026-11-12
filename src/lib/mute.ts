export const MAX_MUTED = 50;
export const MAX_MUTED_LENGTH = 40;

/** Bereinigt die Liste der ausgeblendeten Wörter: getrimmt, ohne Doppelte (gross/klein egal), begrenzt. */
export function cleanMutedWords(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    if (typeof item !== 'string') continue;
    const word = item.replace(/\s+/g, ' ').trim().slice(0, MAX_MUTED_LENGTH).trim();
    const key = word.toLocaleLowerCase();
    if (!word || seen.has(key)) continue;
    seen.add(key);
    out.push(word);
    if (out.length >= MAX_MUTED) break;
  }
  return out;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Prüft, ob ein Text eines der Wörter oder eine der Phrasen enthält, als ganzes Wort und ohne
 * Rücksicht auf gross/klein. «AI» trifft also «New AI model», aber nicht «said». Ohne Wörter: null.
 */
export function makeMuteMatcher(words: string[]): ((text: string) => boolean) | null {
  if (words.length === 0) return null;
  const alternatives = words.map((w) => escapeRegExp(w).replace(/ /g, '\\s+')).join('|');
  const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${alternatives})(?=$|[^\\p{L}\\p{N}])`, 'iu');
  return (text) => pattern.test(text);
}

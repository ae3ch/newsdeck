/**
 * Abstimmung der Aktualisierung zwischen Tabs und über Neuladen hinweg.
 *
 * Alle Tabs teilen sich den Feed-Stand im localStorage (`sharedAt` = Zeitpunkt des letzten
 * erfolgreichen Abrufs). Ist er jünger als ein Intervall, wird er übernommen statt neu geladen.
 * Vor jedem Abruf vermerkt ein Tab zusätzlich, dass er gerade lädt (`claim`); andere Tabs warten
 * dann kurz auf sein Ergebnis, statt parallel dasselbe abzurufen. Schlägt der Abruf ganz fehl,
 * gilt der Vermerk ein volles Intervall, damit auch mehrere Tabs nur einmal pro Minute neu versuchen.
 */

/** Spielraum, damit ein leicht verfrüht feuernder Timer nicht eine Runde überspringt. */
export const DUE_TOLERANCE = 1_000;
/** So lange warten andere Tabs höchstens auf einen laufenden Abruf. */
export const CLAIM_WINDOW = 20_000;

export interface Claim {
  /** Beginn des Abrufs (ms). */
  at: number;
  /** true, wenn der Abruf ganz fehlgeschlagen ist. */
  failed?: boolean;
}

export interface PollInput {
  now: number;
  /** Zeitpunkt des gemeinsam gespeicherten Stands (ms) oder null. */
  sharedAt: number | null;
  claim: Claim | null;
  /** true, wenn der gemeinsame Stand alle aktiven Feeds enthält. */
  covered: boolean;
  interval: number;
}

export type PollDecision = { fetchNow: true } | { fetchNow: false; nextAt: number };

export function decidePoll({ now, sharedAt, claim, covered, interval }: PollInput): PollDecision {
  // Fehlt ein aktiver Feed (z. B. eben eine Quelle hinzugefügt), sofort laden.
  if (!covered) return { fetchNow: true };
  // Zeitstempel aus der Zukunft (Uhr verstellt) werden ignoriert.
  const valid = (t: number | null | undefined): t is number => typeof t === 'number' && t <= now + DUE_TOLERANCE;

  let due = -Infinity;
  if (valid(sharedAt)) due = sharedAt + interval;
  if (claim && valid(claim.at)) due = Math.max(due, claim.at + (claim.failed ? interval : CLAIM_WINDOW));

  if (now >= due - DUE_TOLERANCE) return { fetchNow: true };
  return { fetchNow: false, nextAt: due };
}

/** true, wenn für jede Adresse ein Eintrag vorliegt. */
export function coversAll(feeds: Record<string, unknown>, urls: string[]): boolean {
  return urls.every((u) => Object.prototype.hasOwnProperty.call(feeds, u));
}

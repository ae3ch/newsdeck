/**
 * Coordinates refreshing between tabs and across reloads.
 *
 * All tabs share the feed state in localStorage (`sharedAt` = time of the last successful
 * fetch). If it is younger than one interval, it is reused instead of loaded again.
 * Before each fetch a tab also records that it is loading right now (`claim`); other tabs then
 * wait briefly for its result instead of fetching the same in parallel. If the fetch fails
 * completely, the claim holds for a full interval, so even several tabs retry only once a minute.
 */

/** Leeway, so a timer that fires slightly early does not skip a round. */
export const DUE_TOLERANCE = 1_000;
/** Other tabs wait at most this long for a running fetch. */
export const CLAIM_WINDOW = 20_000;

export interface Claim {
  /** Start of the fetch (ms). */
  at: number;
  /** true when the fetch failed completely. */
  failed?: boolean;
}

export interface PollInput {
  now: number;
  /** Time of the shared stored state (ms), or null. */
  sharedAt: number | null;
  claim: Claim | null;
  /** true when the shared state contains all active feeds. */
  covered: boolean;
  interval: number;
}

export type PollDecision = { fetchNow: true } | { fetchNow: false; nextAt: number };

export function decidePoll({ now, sharedAt, claim, covered, interval }: PollInput): PollDecision {
  // If an active feed is missing (e.g. a source was just added), load at once.
  if (!covered) return { fetchNow: true };
  // Timestamps from the future (clock changed) are ignored.
  const valid = (t: number | null | undefined): t is number => typeof t === 'number' && t <= now + DUE_TOLERANCE;

  let due = -Infinity;
  if (valid(sharedAt)) due = sharedAt + interval;
  if (claim && valid(claim.at)) due = Math.max(due, claim.at + (claim.failed ? interval : CLAIM_WINDOW));

  if (now >= due - DUE_TOLERANCE) return { fetchNow: true };
  return { fetchNow: false, nextAt: due };
}

/** true when there is an entry for every address. */
export function coversAll(feeds: Record<string, unknown>, urls: string[]): boolean {
  return urls.every((u) => Object.prototype.hasOwnProperty.call(feeds, u));
}

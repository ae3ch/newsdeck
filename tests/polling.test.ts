import { describe, expect, it } from 'vitest';
import { CLAIM_WINDOW, coversAll, decidePoll } from '../src/lib/polling';

const I = 60_000;
const NOW = 1_000_000_000;
const base = { now: NOW, sharedAt: null, claim: null, covered: true, interval: I };

describe('decidePoll', () => {
  it('loads when nothing is stored', () => {
    expect(decidePoll(base)).toEqual({ fetchNow: true });
  });

  it('loads at once when an active feed is missing, even with a fresh state', () => {
    expect(decidePoll({ ...base, sharedAt: NOW - 5_000, claim: { at: NOW - 6_000 }, covered: false })).toEqual({
      fetchNow: true,
    });
  });

  it('reuses a state younger than one interval and waits until it is due', () => {
    expect(decidePoll({ ...base, sharedAt: NOW - 20_000 })).toEqual({ fetchNow: false, nextAt: NOW + 40_000 });
  });

  it('loads once the shared state is one interval old', () => {
    expect(decidePoll({ ...base, sharedAt: NOW - I })).toEqual({ fetchNow: true });
    expect(decidePoll({ ...base, sharedAt: NOW - I + 500 })).toEqual({ fetchNow: true }); // Toleranz
  });

  it('waits briefly for another tab that is loading right now', () => {
    expect(decidePoll({ ...base, sharedAt: NOW - 3 * I, claim: { at: NOW - 2_000 } })).toEqual({
      fetchNow: false,
      nextAt: NOW - 2_000 + CLAIM_WINDOW,
    });
  });

  it('takes over when the other tab never delivers', () => {
    expect(decidePoll({ ...base, sharedAt: NOW - 3 * I, claim: { at: NOW - CLAIM_WINDOW } })).toEqual({
      fetchNow: true,
    });
  });

  it('retries a failed attempt only after a full interval, from any tab', () => {
    expect(decidePoll({ ...base, sharedAt: NOW - 3 * I, claim: { at: NOW - 30_000, failed: true } })).toEqual({
      fetchNow: false,
      nextAt: NOW + 30_000,
    });
    expect(decidePoll({ ...base, sharedAt: NOW - 3 * I, claim: { at: NOW - I, failed: true } })).toEqual({
      fetchNow: true,
    });
  });

  it('ignores timestamps from the future (clock changed)', () => {
    expect(decidePoll({ ...base, sharedAt: NOW + 10 * I, claim: { at: NOW + 10 * I } })).toEqual({ fetchNow: true });
  });
});

describe('coversAll', () => {
  it('requires an entry for every address', () => {
    expect(coversAll({ a: 1, b: 2 }, ['a', 'b'])).toBe(true);
    expect(coversAll({ a: 1 }, ['a', 'b'])).toBe(false);
    expect(coversAll({}, [])).toBe(true);
  });
});

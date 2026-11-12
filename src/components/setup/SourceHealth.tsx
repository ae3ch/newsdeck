import { useState } from 'react';
import { discoverFeeds } from '../../lib/api';
import type { Source } from '../../lib/config';
import { Favicon } from '../Favicon';
import { dangerButton, textButton } from './types';
import { panelTitle } from '../ui';

export interface BrokenSource {
  source: Source;
  /** Start of the failure streak (ms). */
  since: number;
  error: string;
}

interface Props {
  broken: BrokenSource[];
  now: number;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onReplaceFeed: (id: string, feedUrl: string) => void;
}

const days = (ms: number) => {
  const d = Math.floor(ms / 86_400_000);
  return d <= 1 ? 'over a day' : `${d} days`;
};

/** Notice about sources that have not loaded for over a day, with remedies. */
export function SourceHealth({ broken, now, onToggle, onRemove, onReplaceFeed }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Record<string, string>>({});
  if (broken.length === 0) return null;

  const findAgain = async (s: Source) => {
    setBusy(s.id);
    try {
      const res = await discoverFeeds(s.siteUrl);
      const other = res.candidates?.find((c) => c.feedUrl !== s.feedUrl);
      if (other) {
        onReplaceFeed(s.id, other.feedUrl);
        setNotice((n) => ({ ...n, [s.id]: `Switched to ${other.feedUrl}` }));
      } else {
        setNotice((n) => ({ ...n, [s.id]: res.error ?? 'No other feed found on the website.' }));
      }
    } catch {
      setNotice((n) => ({ ...n, [s.id]: 'The search failed. Please try again later.' }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="sec-health" className="rounded-lg border border-danger/50 border-l-4 border-l-danger bg-surface p-4 sm:p-6">
      <h2 id="sec-health" className={panelTitle}>
        {broken.length === 1 ? '1 source has' : `${broken.length} sources have`} not loaded for over a day
      </h2>
      <p className="mt-1 text-sm text-muted">
        The site may have moved its feed or be blocking requests. Turn the source off, or search the website for its
        current feed.
      </p>
      <ul className="mt-4 divide-y divide-line rounded-md border border-line">
        {broken.map(({ source: s, since, error }) => (
          <li key={s.id} className="px-3 py-3">
            <div className="flex items-center gap-2.5">
              <Favicon siteUrl={s.siteUrl} name={s.name} size={16} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
              <span className="shrink-0 text-xs text-danger">for {days(now - since)}</span>
            </div>
            <p className="mt-1 truncate font-mono text-xs text-muted" title={error}>
              {error}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={textButton} onClick={() => onToggle(s.id)}>
                Turn off
              </button>
              {s.custom && (
                <>
                  <button type="button" className={textButton} disabled={busy === s.id} onClick={() => findAgain(s)}>
                    {busy === s.id ? 'Searching …' : 'Find feed again'}
                  </button>
                  <button type="button" className={dangerButton} onClick={() => onRemove(s.id)}>
                    Remove
                  </button>
                </>
              )}
            </div>
            {notice[s.id] && (
              <p className="mt-2 text-sm text-muted" role="status">
                {notice[s.id]}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

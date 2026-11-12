import { useRef, useState, type FormEvent } from 'react';
import type { DiscoverCandidate } from '../../shared/types';
import { discoverFeeds } from '../lib/api';
import { hostOf, isHttpUrl } from '../lib/config';
import { PlusIcon } from './icons';
import { btnPrimary, btnSmall, field } from './ui';

export interface NewSource {
  name: string;
  siteUrl: string;
  feedUrl: string;
}

interface Props {
  existingFeedUrls: Set<string>;
  onAdd: (source: NewSource) => void;
}

export function AddSourceForm({ existingFeedUrls, onAdd }: Props) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<DiscoverCandidate[]>([]);
  const request = useRef<AbortController | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    if (!isHttpUrl(url)) {
      setMessage('Please enter a valid web address.');
      return;
    }
    request.current?.abort();
    const ctrl = (request.current = new AbortController());
    setBusy(true);
    setMessage(null);
    setCandidates([]);
    try {
      const res = await discoverFeeds(url, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setCandidates(res.candidates ?? []);
      if (!res.candidates?.length) setMessage(res.error ?? 'No feed found.');
    } catch {
      if (!ctrl.signal.aborted) setMessage('The search failed. Please try again later.');
    } finally {
      if (request.current === ctrl) setBusy(false);
    }
  };

  const add = (c: DiscoverCandidate) => {
    let siteUrl = c.siteUrl;
    if (!isHttpUrl(siteUrl)) siteUrl = new URL(c.feedUrl).origin;
    onAdd({ name: c.title || hostOf(c.feedUrl), siteUrl, feedUrl: c.feedUrl });
    setCandidates((list) => list.filter((x) => x.feedUrl !== c.feedUrl));
    setInput('');
    setMessage(`"${c.title}" was added and now appears first.`);
  };

  return (
    <div>
      <form onSubmit={submit} className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Website or feed address</span>
          <input
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. example.com or example.com/feed.xml"
            className={field}
          />
        </label>
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className={btnPrimary}
        >
          {busy ? 'Searching …' : 'Find feed'}
        </button>
      </form>

      {message && (
        <p className="mt-2 text-sm text-muted" role="status">
          {message}
        </p>
      )}

      {candidates.length > 0 && (
        <ul className="mt-3 space-y-2">
          {candidates.map((c) => {
            const exists = existingFeedUrls.has(c.feedUrl);
            return (
              <li key={c.feedUrl} className="rounded-md border border-line bg-bg p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.title}</p>
                    <p className="truncate font-mono text-xs text-muted">{c.feedUrl}</p>
                  </div>
                  <button
                    type="button"
                    disabled={exists}
                    onClick={() => add(c)}
                    className={btnSmall}
                  >
                    {!exists && <PlusIcon width={14} height={14} />}
                    {exists ? 'Already added' : 'Add'}
                  </button>
                </div>
                {c.sample.length > 0 && (
                  <ul className="mt-2 space-y-0.5 border-t border-line pt-2 text-xs text-muted">
                    {c.sample.map((title, i) => (
                      <li key={i} className="truncate">
                        {title}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

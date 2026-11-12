import { relativeTime } from '../lib/format';
import type { SavedArticle } from '../lib/saved';
import { SaveButton } from './SaveButton';
import { SmartImage } from './SmartImage';

interface Props {
  saved: SavedArticle[];
  now: number;
  showImages: boolean;
  isRead: (link: string) => boolean;
  onRead: (link: string) => void;
  onToggle: (article: SavedArticle) => void;
  onClear: () => void;
  onBack: () => void;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

/** Merkliste «Später lesen»: alle gemerkten Artikel, neueste zuerst. */
export function SavedView({ saved, now, showImages, isRead, onRead, onToggle, onClear, onBack }: Props) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Saved for later</h1>
          <p className="mt-1 text-sm text-muted">
            {saved.length === 0
              ? 'Kept in this browser only.'
              : `${saved.length} ${saved.length === 1 ? 'article' : 'articles'}, kept in this browser only.`}
          </p>
        </div>
        <div className="flex gap-2">
          {saved.length > 0 && (
            <button
              type="button"
              className="h-10 rounded-lg border border-line bg-bg px-3 text-sm font-medium hover:border-danger hover:text-danger sm:h-9"
              onClick={() => {
                if (window.confirm(`Remove all ${saved.length} saved articles?`)) onClear();
              }}
            >
              Remove all
            </button>
          )}
          <button type="button" className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink hover:opacity-90" onClick={onBack}>
            Back to dashboard
          </button>
        </div>
      </div>

      {saved.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          Nothing saved yet. Use the bookmark next to a headline to keep it here.
        </p>
      ) : (
        <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {saved.map((a) => (
            <li key={a.link} className="flex transition-colors hover:bg-sunken">
              <a
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onRead(a.link)}
                onAuxClick={() => onRead(a.link)}
                className="group flex min-w-0 flex-1 gap-3 py-3 pl-4"
              >
                {showImages && (
                  <span className="grid h-14 w-[4.75rem] shrink-0 place-items-center overflow-hidden rounded-md bg-sunken">
                    <SmartImage
                      src={a.image}
                      width={76}
                      height={56}
                      className="h-full w-full object-cover"
                      fallback={
                        <span aria-hidden="true" className="font-mono text-sm font-semibold uppercase text-muted/50">
                          {a.sourceName.charAt(0)}
                        </span>
                      }
                    />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-muted">
                    {a.sourceName}
                    {a.pubDate && ` · ${relativeTime(a.pubDate, now)}`}
                  </span>
                  <span
                    className={`mt-0.5 line-clamp-3 text-[15px] font-medium leading-snug group-hover:text-accent sm:text-sm ${
                      isRead(a.link) ? 'text-muted' : 'text-ink'
                    }`}
                  >
                    {a.title}
                  </span>
                  <span className="mt-1 block text-xs text-muted">Saved {dateFmt.format(a.savedAt)}</span>
                </span>
              </a>
              <SaveButton saved title={a.title} onToggle={() => onToggle(a)} className="mt-1.5 h-10 w-11" />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

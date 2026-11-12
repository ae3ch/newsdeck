import { relativeTime } from '../lib/format';
import type { SavedArticle } from '../lib/saved';
import { SaveButton } from './SaveButton';
import { SmartImage } from './SmartImage';
import { btnDanger, btnPrimary, pageTitle } from './ui';

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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={pageTitle}>Saved for later</h1>
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
              className={btnDanger}
              onClick={() => {
                if (window.confirm(`Remove all ${saved.length} saved articles?`)) onClear();
              }}
            >
              Remove all
            </button>
          )}
          <button type="button" className={btnPrimary} onClick={onBack}>
            Back to dashboard
          </button>
        </div>
      </div>

      {saved.length === 0 ? (
        <p className="rounded-lg border border-dashed border-field/50 px-6 py-14 text-center text-sm text-muted">
          Nothing saved yet. Use the bookmark next to a headline to keep it here.
        </p>
      ) : (
        <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {saved.map((a) => (
            <li key={a.link} className="flex transition-colors duration-150 hover:bg-sunken/70">
              <a
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onRead(a.link)}
                onAuxClick={() => onRead(a.link)}
                className="group flex min-w-0 flex-1 gap-3.5 py-3.5 pl-4"
              >
                {showImages && (
                  <span className="grid h-[3.75rem] w-20 shrink-0 place-items-center overflow-hidden rounded bg-sunken">
                    <SmartImage
                      src={a.image}
                      width={80}
                      height={60}
                      className="h-full w-full object-cover"
                      fallback={
                        <span aria-hidden="true" className="font-mono text-base font-medium uppercase text-muted/60">
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
                    className={`headline mt-0.5 line-clamp-3 text-base font-medium leading-snug tracking-[-0.01em] transition-colors duration-150 group-hover:text-accent sm:text-[15px] ${
                      isRead(a.link) ? 'text-muted' : 'text-ink'
                    }`}
                  >
                    {a.title}
                  </span>
                  <span className="mt-1.5 block font-mono text-[11px] text-muted">Saved {dateFmt.format(a.savedAt)}</span>
                </span>
              </a>
              <SaveButton saved title={a.title} onToggle={() => onToggle(a)} className="mt-2 h-11 w-11 sm:h-9 sm:w-10" />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

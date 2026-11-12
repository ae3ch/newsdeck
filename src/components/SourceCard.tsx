import { memo, useRef, type HTMLAttributes } from 'react';
import type { Article } from '../../shared/types';
import { categoryLabel } from '../data/defaultSources';
import type { Source } from '../lib/config';
import { isSafeLink, relativeTime } from '../lib/format';
import { Favicon } from './Favicon';
import { SaveButton } from './SaveButton';
import { SmartImage } from './SmartImage';
import { ExternalIcon, GripIcon } from './icons';
import { kicker } from './ui';

interface Props {
  source: Source;
  /** undefined = not loaded yet. */
  articles: Article[] | undefined;
  error?: string;
  limit: number;
  /** Articles shown in addition to `limit`. */
  extra: number;
  /** Shows another batch of `step` articles. */
  onMore: (sourceId: string, step: number) => void;
  onLess: (sourceId: string) => void;
  isRead: (link: string) => boolean;
  onRead: (link: string) => void;
  isSaved: (link: string) => boolean;
  onSave: (article: Article, source: Source) => void;
  now: number;
  filtered: boolean;
  showImages: boolean;
  /** Attributes and listeners for the drag handle (from dnd-kit). */
  handleProps?: HTMLAttributes<HTMLButtonElement>;
}

function Skeleton({ rows, images }: { rows: number; images: boolean }) {
  return (
    <div className="animate-pulse space-y-5 px-4 py-4" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3">
          {images && <div className="h-[3.75rem] w-20 shrink-0 rounded bg-sunken" />}
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 rounded bg-sunken" style={{ width: `${92 - (i % 3) * 14}%` }} />
            <div className="h-2.5 w-16 rounded bg-sunken" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Thumb({ src, name }: { src: string | undefined; name: string }) {
  return (
    <span className="grid h-[3.75rem] w-20 shrink-0 place-items-center overflow-hidden rounded bg-sunken">
      <SmartImage
        src={src}
        width={80}
        height={60}
        className="h-full w-full object-cover"
        fallback={
          <span aria-hidden="true" className="font-mono text-base font-medium uppercase text-muted/60">
            {name.trim().charAt(0)}
          </span>
        }
      />
    </span>
  );
}

export const SourceCard = memo(function SourceCard(p: Props) {
  const card = useRef<HTMLElement>(null);
  const { extra } = p;
  const all = p.articles ?? [];
  const visible = all.slice(0, p.limit + extra);
  const hidden = all.length - visible.length;

  const collapse = () => {
    p.onLess(p.source.id);
    // After collapsing, the top of the card would often be far above the viewport: bring it back.
    requestAnimationFrame(() => {
      const el = card.current;
      if (el && el.getBoundingClientRect().top < 72) el.scrollIntoView({ block: 'start' });
    });
  };

  return (
    <article ref={card} className="flex scroll-mt-20 flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <header className="flex items-center gap-2 border-b border-line py-0.5 pl-1 pr-1 sm:py-2 sm:pl-1.5 sm:pr-2">
        <button
          type="button"
          {...p.handleProps}
          aria-label={`Move ${p.source.name}`}
          title="Drag to reorder"
          className="grid h-11 w-8 shrink-0 cursor-grab touch-none place-items-center rounded text-muted transition-colors duration-150 hover:bg-sunken hover:text-ink active:cursor-grabbing sm:h-8 sm:w-6 sm:text-muted/70"
        >
          <GripIcon width={16} height={16} />
        </button>
        <Favicon siteUrl={p.source.siteUrl} name={p.source.name} />
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">{p.source.name}</h2>
        {categoryLabel(p.source.category) && (
          <span className={`${kicker} hidden shrink-0 text-muted sm:inline`}>
            {categoryLabel(p.source.category)}
          </span>
        )}
        {isSafeLink(p.source.siteUrl) && (
          <a
            href={p.source.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${p.source.name}`}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-sunken hover:text-accent sm:h-8 sm:w-8"
          >
            <ExternalIcon width={15} height={15} />
          </a>
        )}
      </header>

      {p.error && (
        <p className="border-b border-line bg-danger/5 px-4 py-2 text-xs text-danger">
          {all.length > 0 ? 'Update failed, showing the last known articles' : 'Feed unavailable'}: {p.error}
        </p>
      )}

      {p.articles === undefined && !p.error ? (
        <Skeleton rows={Math.min(p.limit, 6)} images={p.showImages} />
      ) : all.length === 0 ? (
        !p.error && (
          <p className="px-4 py-6 text-sm text-muted">
            {p.filtered ? 'No matches in this source.' : 'No articles available.'}
          </p>
        )
      ) : (
        <ol className="divide-y divide-line">
          {visible.map((a) => (
            <li key={a.link} className="group/row flex transition-colors duration-150 hover:bg-sunken/70">
              <a
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                title={a.description || undefined}
                onClick={() => p.onRead(a.link)}
                onAuxClick={() => p.onRead(a.link)}
                className="group flex min-w-0 flex-1 gap-3.5 py-3.5 pl-4 sm:py-3"
              >
                {p.showImages && <Thumb src={a.image} name={p.source.name} />}
                <span className="min-w-0 flex-1">
                  <span
                    className={`headline line-clamp-3 text-base font-medium leading-snug tracking-[-0.01em] transition-colors duration-150 group-hover:text-accent group-visited:text-muted sm:text-[15px] ${
                      p.isRead(a.link) ? 'text-muted' : 'text-ink'
                    }`}
                  >
                    {a.title}
                  </span>
                  {a.pubDate && (
                    <time dateTime={a.pubDate} className="mt-1.5 block font-mono text-[11px] text-muted">
                      {relativeTime(a.pubDate, p.now)}
                    </time>
                  )}
                </span>
              </a>
              {/* With a mouse visible only on hover, always on touch devices. */}
              <SaveButton
                saved={p.isSaved(a.link)}
                title={a.title}
                onToggle={() => p.onSave(a, p.source)}
                className={`mt-2 h-11 w-11 sm:mt-2 sm:h-8 sm:w-10 ${
                  p.isSaved(a.link) ? '' : 'pointer-fine:opacity-0 pointer-fine:group-hover/row:opacity-100 focus-visible:opacity-100'
                }`}
              />
            </li>
          ))}
        </ol>
      )}

      {(hidden > 0 || extra > 0) && (
        <div className="flex border-t border-line text-sm font-medium text-muted sm:text-[13px]">
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => p.onMore(p.source.id, p.limit)}
              className="min-h-11 flex-1 px-4 text-left transition-colors duration-150 hover:bg-sunken hover:text-ink sm:min-h-9"
            >
              Show {Math.min(p.limit, hidden)} more
            </button>
          )}
          {extra > 0 && (
            <button
              type="button"
              onClick={collapse}
              className={`min-h-11 px-4 transition-colors duration-150 hover:bg-sunken hover:text-ink sm:min-h-9 ${hidden > 0 ? '' : 'flex-1 text-left'}`}
            >
              Show less
            </button>
          )}
        </div>
      )}
    </article>
  );
});

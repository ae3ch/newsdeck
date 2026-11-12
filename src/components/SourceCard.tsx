import { memo, useRef, type HTMLAttributes } from 'react';
import type { Article } from '../../shared/types';
import { categoryLabel } from '../data/defaultSources';
import type { Source } from '../lib/config';
import { isSafeLink, relativeTime } from '../lib/format';
import { Favicon } from './Favicon';
import { SmartImage } from './SmartImage';
import { ExternalIcon, GripIcon } from './icons';

interface Props {
  source: Source;
  /** undefined = noch nicht geladen. */
  articles: Article[] | undefined;
  error?: string;
  limit: number;
  /** Zusätzlich zu `limit` eingeblendete Artikel. */
  extra: number;
  /** Blendet eine weitere Portion von `step` Artikeln ein. */
  onMore: (sourceId: string, step: number) => void;
  onLess: (sourceId: string) => void;
  isRead: (link: string) => boolean;
  onRead: (link: string) => void;
  now: number;
  filtered: boolean;
  showImages: boolean;
  /** Attribute und Listener für den Ziehgriff (von dnd-kit). */
  handleProps?: HTMLAttributes<HTMLButtonElement>;
}

function Skeleton({ rows, images }: { rows: number; images: boolean }) {
  return (
    <div className="animate-pulse space-y-4 px-4 py-4" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3">
          {images && <div className="h-14 w-[4.75rem] shrink-0 rounded-md bg-sunken" />}
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
    <span className="grid h-14 w-[4.75rem] shrink-0 place-items-center overflow-hidden rounded-md bg-sunken">
      <SmartImage
        src={src}
        width={76}
        height={56}
        className="h-full w-full object-cover"
        fallback={
          <span aria-hidden="true" className="font-mono text-sm font-semibold uppercase text-muted/50">
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
    // Nach dem Einklappen läge der Kartenanfang oft weit über dem Bildausschnitt: zurückholen.
    requestAnimationFrame(() => {
      const el = card.current;
      if (el && el.getBoundingClientRect().top < 72) el.scrollIntoView({ block: 'start' });
    });
  };

  return (
    <article ref={card} className="flex scroll-mt-20 flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex items-center gap-2 border-b border-line py-1 pl-1 pr-1 sm:py-2.5 sm:pl-2 sm:pr-3">
        <button
          type="button"
          {...p.handleProps}
          aria-label={`Move ${p.source.name}`}
          title="Drag to reorder"
          className="grid h-10 w-8 shrink-0 cursor-grab touch-none place-items-center rounded text-muted hover:bg-sunken sm:text-muted/60 hover:text-ink active:cursor-grabbing sm:h-7 sm:w-6"
        >
          <GripIcon width={16} height={16} />
        </button>
        <Favicon siteUrl={p.source.siteUrl} name={p.source.name} />
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{p.source.name}</h2>
        {categoryLabel(p.source.category) && (
          <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted sm:inline">
            {categoryLabel(p.source.category)}
          </span>
        )}
        {isSafeLink(p.source.siteUrl) && (
          <a
            href={p.source.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${p.source.name}`}
            className="grid h-10 w-10 shrink-0 place-items-center text-muted hover:text-accent sm:h-auto sm:w-auto"
          >
            <ExternalIcon width={15} height={15} />
          </a>
        )}
      </header>

      {p.error && (
        <p className="border-b border-line bg-sunken px-4 py-2 text-xs text-danger">
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
            <li key={a.link}>
              <a
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                title={a.description || undefined}
                onClick={() => p.onRead(a.link)}
                onAuxClick={() => p.onRead(a.link)}
                className="group flex gap-3 px-4 py-3 transition-colors hover:bg-sunken sm:py-2.5"
              >
                {p.showImages && <Thumb src={a.image} name={p.source.name} />}
                <span className="min-w-0 flex-1">
                  <span
                    className={`line-clamp-3 text-[15px] font-medium leading-snug group-hover:text-accent group-visited:text-muted sm:text-sm ${
                      p.isRead(a.link) ? 'text-muted' : 'text-ink'
                    }`}
                  >
                    {a.title}
                  </span>
                  {a.pubDate && (
                    <time dateTime={a.pubDate} className="mt-1 block text-xs text-muted">
                      {relativeTime(a.pubDate, p.now)}
                    </time>
                  )}
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}

      {(hidden > 0 || extra > 0) && (
        <div className="flex border-t border-line text-sm font-medium text-muted sm:text-xs">
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => p.onMore(p.source.id, p.limit)}
              className="min-h-11 flex-1 px-4 text-left hover:bg-sunken hover:text-ink sm:min-h-8"
            >
              Show {Math.min(p.limit, hidden)} more
            </button>
          )}
          {extra > 0 && (
            <button
              type="button"
              onClick={collapse}
              className={`min-h-11 px-4 hover:bg-sunken hover:text-ink sm:min-h-8 ${hidden > 0 ? '' : 'flex-1 text-left'}`}
            >
              Show less
            </button>
          )}
        </div>
      )}
    </article>
  );
});

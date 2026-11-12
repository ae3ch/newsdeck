import { relativeTime } from '../lib/format';
import type { Story } from '../lib/topStories';
import { Favicon } from './Favicon';
import { SmartImage } from './SmartImage';

function StoryImage({ story }: { story: Story }) {
  return (
    <SmartImage
      src={story.article.image}
      width={128}
      height={96}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      fallback={
        <div className="grid h-full w-full place-items-center bg-sunken px-2 text-center font-mono text-[10px] uppercase leading-tight tracking-wider text-muted [overflow-wrap:anywhere]">
          {story.source.name}
        </div>
      }
    />
  );
}

interface Props {
  stories: Story[];
  now: number;
  isRead: (link: string) => boolean;
  onRead: (link: string) => void;
}

export function TopStories({ stories, now, isRead, onRead }: Props) {
  if (stories.length === 0) return null;
  return (
    <section aria-labelledby="top-stories" className="mb-8 sm:mb-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="top-stories" className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Top stories today
        </h2>
        <p className="text-xs text-muted">Topics covered by several of your sources come first</p>
      </div>
      {/* Schmal: Leiste zum seitlichen Wischen bis an den Bildschirmrand, die nächste Karte schaut hervor. Ab `sm`: Raster. */}
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
        {stories.map((story) => (
          <a
            key={story.article.link}
            href={story.article.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onRead(story.article.link)}
            onAuxClick={() => onRead(story.article.link)}
            className="group flex w-[85%] shrink-0 snap-start gap-3 rounded-xl border border-line bg-surface p-2.5 transition-colors hover:border-accent sm:w-auto"
          >
            <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-lg sm:w-32">
              <StoryImage story={story} />
              {/* Schmal: Zahl der Quellen als kleine Marke auf dem Bild, damit der Titel den Platz behält. */}
              {story.coveredBy.length > 1 && (
                <span
                  aria-label={`Covered by ${story.coveredBy.length} sources`}
                  className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-white sm:hidden"
                >
                  {story.coveredBy.length} sources
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-col py-0.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted">
                <Favicon siteUrl={story.source.siteUrl} name={story.source.name} size={14} />
                <span className="truncate font-medium">{story.source.name}</span>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">{relativeTime(story.article.pubDate, now)}</span>
              </div>
              <h3
                className={`line-clamp-4 text-[15px] font-semibold leading-snug group-hover:text-accent sm:line-clamp-3 sm:text-sm ${
                  isRead(story.article.link) ? 'text-muted' : ''
                }`}
              >
                {story.article.title}
              </h3>
              {story.coveredBy.length > 1 && (
                <p
                  className="mt-auto hidden pt-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent sm:block"
                  title={`Also covered by: ${story.coveredBy.filter((n) => n !== story.source.name).join(', ')}`}
                >
                  Covered by {story.coveredBy.length} sources
                </p>
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

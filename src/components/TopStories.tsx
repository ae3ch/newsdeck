import type { CSSProperties } from 'react';
import { relativeTime } from '../lib/format';
import type { Story } from '../lib/topStories';
import { Favicon } from './Favicon';
import { SaveButton } from './SaveButton';
import { SmartImage } from './SmartImage';
import { SectionHeading, kicker } from './ui';

function StoryImage({ story, lead }: { story: Story; lead: boolean }) {
  return (
    <SmartImage
      src={story.article.image}
      width={lead ? 560 : 240}
      height={lead ? 315 : 135}
      className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
      fallback={
        <div className="grid h-full w-full place-items-center bg-sunken px-3 text-center font-mono text-xs font-medium uppercase leading-tight text-muted [overflow-wrap:anywhere]">
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
  isSaved: (link: string) => boolean;
  onSave: (story: Story) => void;
}

/*
 * Aufbau je Breite:
 * - schmal: Wisch-Leiste, jede Meldung mit Bild oben, die nächste schaut hervor;
 * - ab `sm`: Aufmacher über die ganze Breite (Bild links), darunter zwei Spalten mit kleinen Bildern;
 * - ab `lg`: Aufmacher links mit großem Bild, die übrigen Meldungen als Liste rechts daneben.
 */
const LAYOUT = {
  lead: {
    wrap: 'sm:col-span-2 sm:pb-5 lg:col-span-1 lg:row-span-(--rows) lg:border-r lg:border-line lg:pb-0 lg:pr-8',
    link: 'sm:flex-row sm:gap-6 lg:flex-col lg:gap-4',
    image: 'sm:w-1/2 lg:w-full',
    body: 'sm:pr-10 sm:pt-1 lg:pr-0 lg:pt-0',
    title: 'text-lg leading-tight sm:text-2xl lg:text-[1.75rem] lg:leading-[1.15]',
    save: 'sm:right-0 sm:top-0 lg:right-10 lg:top-2',
    // Auf dem Bild mit Schleier, ab `sm` neben der Schlagzeile, ab `lg` wieder auf dem Bild.
    tone: (saved: boolean) =>
      saved
        ? 'bg-black/55 text-accent-bright sm:bg-transparent sm:text-accent lg:bg-black/55 lg:text-accent-bright'
        : 'bg-black/55 text-white sm:bg-transparent sm:text-muted sm:hover:text-accent lg:bg-black/55 lg:text-white lg:hover:text-white',
  },
  item: {
    wrap: 'sm:py-3 lg:py-2.5',
    link: 'sm:flex-row-reverse sm:gap-4',
    image: 'sm:w-32 lg:w-28',
    body: 'sm:pr-10',
    title: 'text-base leading-snug sm:line-clamp-3',
    save: 'sm:right-0 sm:top-3',
    tone: (saved: boolean) =>
      saved
        ? 'bg-black/55 text-accent-bright sm:bg-transparent sm:text-accent'
        : 'bg-black/55 text-white sm:bg-transparent sm:text-muted sm:hover:text-accent',
  },
} as const;

export function TopStories({ stories, now, isRead, onRead, isSaved, onSave }: Props) {
  if (stories.length === 0) return null;
  const rows = { '--rows': Math.max(1, stories.length - 1) } as CSSProperties;
  return (
    <section aria-labelledby="top-stories" className="mb-12 sm:mb-14">
      <SectionHeading id="top-stories" title="Top stories today" />
      <div
        style={rows}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-0 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] [&::-webkit-scrollbar]:hidden"
      >
        {stories.map((story, i) => {
          const l = i === 0 ? LAYOUT.lead : LAYOUT.item;
          const saved = isSaved(story.article.link);
          const read = isRead(story.article.link);
          const covered = story.coveredBy.length > 1;
          return (
            <div key={story.article.link} className={`group/story relative w-[82%] shrink-0 snap-start sm:w-auto ${l.wrap} ${i === 1 ? 'lg:pt-0' : ''}`}>
              <a
                href={story.article.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onRead(story.article.link)}
                onAuxClick={() => onRead(story.article.link)}
                className={`group flex h-full flex-col gap-3 rounded-sm ${l.link}`}
              >
                <div className={`relative aspect-[16/9] w-full shrink-0 self-start overflow-hidden rounded-md bg-sunken ${l.image} ${i === 0 ? '' : 'sm:aspect-[4/3]'}`}>
                  <StoryImage story={story} lead={i === 0} />
                </div>
                <div className={`flex min-w-0 flex-1 flex-col ${l.body}`}>
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted">
                    <Favicon siteUrl={story.source.siteUrl} name={story.source.name} size={14} />
                    <span className="truncate font-medium text-ink/80">{story.source.name}</span>
                    <span aria-hidden="true">·</span>
                    <span className="shrink-0 font-mono text-[11px]">{relativeTime(story.article.pubDate, now)}</span>
                  </div>
                  <h3
                    className={`headline line-clamp-4 font-semibold tracking-tight transition-colors duration-150 group-hover:text-accent ${l.title} ${
                      read ? 'text-muted' : ''
                    }`}
                  >
                    {story.article.title}
                  </h3>
                  {i === 0 && story.article.description && (
                    <p className="mt-2.5 line-clamp-3 text-[15px] leading-relaxed text-muted max-lg:hidden">{story.article.description}</p>
                  )}
                  {covered && (
                    <p
                      className={`${kicker} mt-2 flex items-center gap-1.5 text-accent`}
                      title={`Also covered by: ${story.coveredBy.filter((n) => n !== story.source.name).join(', ')}`}
                    >
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
                      Covered by {story.coveredBy.length} sources
                    </p>
                  )}
                </div>
              </a>
              <SaveButton
                saved={saved}
                title={story.article.title}
                onToggle={() => onSave(story)}
                tone={l.tone(saved)}
                className={`absolute right-2 top-2 h-9 w-9 rounded-full backdrop-blur-sm sm:h-9 sm:w-9 sm:rounded-md sm:backdrop-blur-none ${l.save} ${
                  i === 0 ? 'lg:rounded-full lg:backdrop-blur-sm' : ''
                } ${saved ? '' : 'pointer-fine:opacity-0 pointer-fine:group-hover/story:opacity-100 focus-visible:opacity-100'}`}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

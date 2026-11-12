import type { Topic } from '../lib/topics';

interface Props {
  topics: Topic[];
  /** Gewähltes Thema oder null für alle. */
  value: string | null;
  onChange: (topic: string | null) => void;
}

/** Themen als Chips über den Karten: auf schmalen Bildschirmen seitlich wischbar, sonst umbrechend. */
export function TopicFilter({ topics, value, onChange }: Props) {
  const chips = [{ id: null, label: 'All', count: topics.reduce((n, t) => n + t.count, 0) }, ...topics];
  return (
    <div
      role="group"
      aria-label="Filter sources by topic"
      className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {chips.map((chip) => {
        const on = chip.id === value;
        return (
          <button
            key={chip.id ?? 'all'}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(chip.id)}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors sm:h-8 ${
              on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-muted hover:border-muted hover:text-ink'
            }`}
          >
            {chip.label}
            <span className="font-mono text-xs opacity-70">{chip.count}</span>
          </button>
        );
      })}
    </div>
  );
}

import type { Settings, Theme } from '../../lib/config';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function DisplaySettings({ settings, onSettings }: { settings: Settings; onSettings: (patch: Partial<Settings>) => void }) {
  return (
    <div className="space-y-4 text-[15px] sm:text-sm">
      <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <legend className="float-left mr-4 font-medium">Theme</legend>
        {THEMES.map((t) => (
          <label key={t.value} className="flex min-h-9 cursor-pointer items-center gap-1.5 sm:min-h-0">
            <input type="radio" name="theme" checked={settings.theme === t.value} onChange={() => onSettings({ theme: t.value })} className="accent-(--accent)" />
            {t.label}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-wrap items-center gap-3">
        <span className="font-medium">Articles per card</span>
        <input
          type="range"
          min={3}
          max={20}
          value={settings.articlesPerCard}
          onChange={(e) => onSettings({ articlesPerCard: Number(e.target.value) })}
          className="w-40 accent-(--accent)"
        />
        <span className="w-6 font-mono tabular-nums">{settings.articlesPerCard}</span>
      </label>
      <label className="flex cursor-pointer items-center gap-2.5">
        <input type="checkbox" checked={settings.showTopStories} onChange={(e) => onSettings({ showTopStories: e.target.checked })} className="h-4 w-4 accent-(--accent)" />
        <span className="font-medium">Show the "Top stories today" section</span>
      </label>
      <label className="flex cursor-pointer items-center gap-2.5">
        <input type="checkbox" checked={settings.showImages} onChange={(e) => onSettings({ showImages: e.target.checked })} className="h-4 w-4 accent-(--accent)" />
        <span className="font-medium">Show preview images for all articles</span>
      </label>
    </div>
  );
}

import type { DashboardConfig, Settings } from '../../lib/config';
import type { NewSource } from '../AddSourceForm';

/** Alle Änderungen, die Anpassen-Seite und Einrichtung am Layout vornehmen können. */
export interface SetupActions {
  onToggle: (id: string) => void;
  /** Schaltet mehrere Quellen auf einmal ein oder aus (z. B. ein ganzes Thema). */
  onSetMany: (ids: string[], enabled: boolean) => void;
  onShift: (id: string, delta: -1 | 1) => void;
  onRemove: (id: string) => void;
  onAdd: (source: NewSource) => void;
  /** Ersetzt die Feed-Adresse einer Quelle (z. B. nach einem Umzug des Feeds). */
  onReplaceFeed: (id: string, feedUrl: string) => void;
  onSettings: (patch: Partial<Settings>) => void;
  onReplace: (config: DashboardConfig) => void;
  onReset: () => void;
}

// Auf schmalen Bildschirmen sind Schaltflächen eine Stufe höher, damit sie sich sicher antippen lassen.
const outlined =
  'rounded-lg border border-line bg-bg font-medium hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink';
export const textButton = `${outlined} h-10 px-3 text-sm sm:h-9`;
export const smallButton = `${outlined} h-9 px-2.5 text-xs sm:h-8`;
export const primaryButton =
  'h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-40';
export const iconButton =
  'grid h-10 w-10 shrink-0 place-items-center rounded-md sm:h-8 sm:w-8 text-muted hover:bg-sunken hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent';

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

// Die Klassen stehen zentral in ui.tsx; hier unter den bisherigen Namen für die Einrichtungsansichten.
export {
  btnSecondary as textButton,
  btnSmall as smallButton,
  btnPrimary as primaryButton,
  btnIconSm as iconButton,
  btnDanger as dangerButton,
} from '../ui';

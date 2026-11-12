import type { DashboardConfig, Settings } from '../../lib/config';
import type { NewSource } from '../AddSourceForm';

/** All changes the customize page and the setup can make to the layout. */
export interface SetupActions {
  onToggle: (id: string) => void;
  /** Turns several sources on or off at once (e.g. a whole topic). */
  onSetMany: (ids: string[], enabled: boolean) => void;
  onShift: (id: string, delta: -1 | 1) => void;
  onRemove: (id: string) => void;
  onAdd: (source: NewSource) => void;
  /** Replaces the feed address of a source (e.g. after the feed has moved). */
  onReplaceFeed: (id: string, feedUrl: string) => void;
  onSettings: (patch: Partial<Settings>) => void;
  onReplace: (config: DashboardConfig) => void;
  onReset: () => void;
}

// The classes live centrally in ui.tsx; here under their previous names for the setup views.
export {
  btnSecondary as textButton,
  btnSmall as smallButton,
  btnPrimary as primaryButton,
  btnIconSm as iconButton,
  btnDanger as dangerButton,
} from '../ui';

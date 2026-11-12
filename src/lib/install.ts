import { useSyncExternalStore } from 'react';

/** iPhone and iPad, even when the iPad identifies as a Mac. Applies to all browsers there. */
export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export const isAndroid = (): boolean => /Android/i.test(navigator.userAgent);

/** true when the page runs as an app from the home screen and not in a browser tab. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Adds the web app manifest, except on iOS: there its `start_url` would replace the address
 * under which the icon is added, and with it the layout in the home screen link.
 */
export function attachManifest(): void {
  if (isIos()) return;
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = '/manifest.webmanifest';
  document.head.append(link);
}

/** Registers the service worker that lets the app start offline (see src/sw.js). Production build only. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    // Without a service worker everything works as before, just not offline.
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// --- The browser's install dialog (Chrome, Edge, Samsung Internet) ---

interface InstallPromptEvent extends Event {
  prompt: () => Promise<unknown>;
}

let promptEvent: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const setPromptEvent = (e: InstallPromptEvent | null) => {
  promptEvent = e;
  listeners.forEach((notify) => notify());
};

// The browser fires the event shortly after loading, so start listening here already.
window.addEventListener('beforeinstallprompt', (e) => setPromptEvent(e as InstallPromptEvent));
window.addEventListener('appinstalled', () => setPromptEvent(null));

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

/** Function that opens the install dialog, or null when the browser offers none. */
export function useInstallPrompt(): (() => void) | null {
  const event = useSyncExternalStore(subscribe, () => promptEvent);
  if (!event) return null;
  return () => {
    // The event can only be used once.
    setPromptEvent(null);
    void event.prompt();
  };
}

import { useSyncExternalStore } from 'react';

/** iPhone und iPad, auch wenn sich das iPad als Mac ausgibt. Gilt für alle Browser dort. */
export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export const isAndroid = (): boolean => /Android/i.test(navigator.userAgent);

/** true, wenn die Seite als App vom Homescreen läuft und nicht in einem Browser-Tab. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Bindet das Web-App-Manifest ein, ausser auf iOS: Dort würde dessen `start_url` die Adresse
 * ersetzen, unter der das Icon angelegt wird, und mit ihr das Layout im Homescreen-Link.
 */
export function attachManifest(): void {
  if (isIos()) return;
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = '/manifest.webmanifest';
  document.head.append(link);
}

/** Meldet den Service Worker an, der die App ohne Netz starten lässt (siehe src/sw.js). Nur im Build. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    // Ohne Service Worker läuft alles wie bisher, nur eben nicht ohne Netz.
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// --- Installationsdialog des Browsers (Chrome, Edge, Samsung Internet) ---

interface InstallPromptEvent extends Event {
  prompt: () => Promise<unknown>;
}

let promptEvent: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const setPromptEvent = (e: InstallPromptEvent | null) => {
  promptEvent = e;
  listeners.forEach((notify) => notify());
};

// Der Browser meldet das Ereignis kurz nach dem Laden, also schon hier mithören.
window.addEventListener('beforeinstallprompt', (e) => setPromptEvent(e as InstallPromptEvent));
window.addEventListener('appinstalled', () => setPromptEvent(null));

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

/** Funktion, die den Installationsdialog öffnet, oder null, wenn der Browser keinen anbietet. */
export function useInstallPrompt(): (() => void) | null {
  const event = useSyncExternalStore(subscribe, () => promptEvent);
  if (!event) return null;
  return () => {
    // Das Ereignis lässt sich nur einmal verwenden.
    setPromptEvent(null);
    void event.prompt();
  };
}

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Dateien aus public/, die die App zum Starten ohne Netz braucht. */
const SHELL = ['/theme.js', '/favicon.svg', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png'];

/** Schreibt /sw.js aus src/sw.js und setzt die Liste der Build-Dateien samt Version ein. */
function serviceWorker(): Plugin {
  return {
    name: 'newsdeck-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle)
        .filter((file) => file !== 'index.html')
        .map((file) => `/${file}`);
      const files = ['/', ...built, ...SHELL];
      const template = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8');
      const version = createHash('sha1').update(template).update(JSON.stringify(files)).digest('hex').slice(0, 10);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files)),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorker()],
  server: {
    // Im Dev-Modus laufen die Pages Functions unter wrangler auf Port 8788.
    proxy: { '/api': 'http://127.0.0.1:8788' },
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});

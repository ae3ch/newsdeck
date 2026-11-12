import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Files from public/ that the app needs to start offline. */
const SHELL = ['/theme.js', '/favicon.svg', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png'];

/** Writes /sw.js from src/sw.js and fills in the list of build files and the version. */
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
    // In dev mode the worker (API) runs under wrangler on port 8788.
    proxy: { '/api': 'http://127.0.0.1:8788' },
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});

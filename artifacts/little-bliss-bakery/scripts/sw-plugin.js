import { createHash } from 'node:crypto';
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { renderServiceWorker } from './service-worker.js';

/** Files that exist in dist but are never fetched while the app is running. */
const SKIP = new Set(['/little-bliss-cover.png', '/robots.txt', '/sw.js']);

/**
 * The Tesseract wasm cores and language model total ~9.5 MB. Precaching them
 * would make every first visit pay for a feature most sessions never touch, so
 * they are left to the runtime cache: fetched and stored on the first receipt
 * scan, still served offline afterwards.
 */
const isOcrAsset = (url) => url.startsWith('/vendor/tesseract/');

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

/**
 * Emits `dist/sw.js` after the bundle is written, precaching every file the app
 * needs to boot. The cache version is derived from each file's path and size so
 * an unchanged rebuild does not force a full re-download.
 */
export function serviceWorkerPlugin() {
  let outDir = path.resolve(process.cwd(), 'dist');
  return {
    name: 'little-bliss-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      if (!existsSync(path.join(outDir, 'index.html'))) return;

      const urls = walk(outDir)
        .map((file) => '/' + path.relative(outDir, file).split(path.sep).join('/'))
        .filter((url) => !SKIP.has(url) && !isOcrAsset(url) && !url.endsWith('.map'))
        .sort((a, b) => Number(b === '/index.html') - Number(a === '/index.html') || a.localeCompare(b));

      const digest = createHash('sha256');
      for (const url of urls) digest.update(url).update(String(statSync(path.join(outDir, url.slice(1))).size));
      const version = digest.digest('hex').slice(0, 12);

      writeFileSync(path.join(outDir, 'sw.js'), renderServiceWorker(urls, version), 'utf8');
    },
  };
}

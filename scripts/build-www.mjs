// Copies the web app into www/, the folder Capacitor packs into the Android and iOS apps.
// (The service worker and the PWA manifest are for the browser only and are left out.)
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const item of ['index.html', 'privacy.html', 'css', 'js', 'assets', 'icons']) {
  const from = join(root, item);
  if (!existsSync(from)) throw new Error('missing ' + item);
  cpSync(from, join(out, item), { recursive: true });
}
console.log('www ready');

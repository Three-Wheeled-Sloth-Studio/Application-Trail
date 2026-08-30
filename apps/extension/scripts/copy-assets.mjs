import { copyFile, mkdir, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
await mkdir(dist, { recursive: true });
await Promise.all([
  copyFile(new URL('../static/manifest.json', import.meta.url), new URL('../dist/manifest.json', import.meta.url)),
  copyFile(new URL('../static/popup.html', import.meta.url), new URL('../dist/popup.html', import.meta.url))
]);

const serverOrigin = process.env.APPLICATION_TRAIL_EXTENSION_ORIGIN ?? 'https://trail.threewheeledsloth.com';
await writeFile(
  new URL('../dist/config.json', import.meta.url),
  JSON.stringify({
    serverOrigin,
    allowDevIdentity: process.env.APPLICATION_TRAIL_ENABLE_DEV_IDENTITY === 'true'
  }, null, 2),
  'utf8'
);

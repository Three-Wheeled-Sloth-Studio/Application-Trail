import { copyFile, mkdir } from 'node:fs/promises';

await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await Promise.all([
  copyFile(new URL('../static/manifest.json', import.meta.url), new URL('../dist/manifest.json', import.meta.url)),
  copyFile(new URL('../static/popup.html', import.meta.url), new URL('../dist/popup.html', import.meta.url))
]);

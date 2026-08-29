import { copyFile, mkdir } from 'node:fs/promises';

await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await Promise.all([
  copyFile(new URL('../index.html', import.meta.url), new URL('../dist/index.html', import.meta.url)),
  copyFile(new URL('../src/style.css', import.meta.url), new URL('../dist/style.css', import.meta.url))
]);

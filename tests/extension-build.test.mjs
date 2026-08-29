import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('extension build is a Manifest V3 capture surface', async () => {
  const manifest = JSON.parse(await readFile(new URL('../apps/extension/dist/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.action.default_popup, 'popup.html');
  assert.ok(manifest.permissions.includes('scripting'));
  assert.ok(manifest.host_permissions.includes('http://127.0.0.1:4310/*'));
});

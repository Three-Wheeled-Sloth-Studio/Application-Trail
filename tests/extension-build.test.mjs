import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('extension build is a Manifest V3 authenticated capture surface', async () => {
  const manifest = JSON.parse(await readFile(new URL('../apps/extension/dist/manifest.json', import.meta.url), 'utf8'));
  const config = JSON.parse(await readFile(new URL('../apps/extension/dist/config.json', import.meta.url), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.action.default_popup, 'popup.html');
  assert.ok(manifest.permissions.includes('scripting'));
  assert.ok(manifest.host_permissions.includes('https://trail.threewheeledsloth.com/*'));
  assert.equal(config.serverOrigin, process.env.APPLICATION_TRAIL_EXTENSION_ORIGIN ?? 'https://trail.threewheeledsloth.com');
  assert.equal(typeof config.allowDevIdentity, 'boolean');
});

import { spawnSync } from 'node:child_process';

const result = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
if (result.status !== 0) {
  console.error(result.stderr || 'git ls-files failed');
  process.exit(result.status ?? 1);
}

const trackedPaths = result.stdout.split('\0').filter(Boolean);
const byFoldedPath = new Map();
const collisions = [];

for (const trackedPath of trackedPaths) {
  const normalized = trackedPath.replaceAll('\\', '/');
  const folded = normalized.toLocaleLowerCase('en-US');
  const existing = byFoldedPath.get(folded);
  if (existing && existing !== normalized) {
    collisions.push([existing, normalized]);
  } else {
    byFoldedPath.set(folded, normalized);
  }
}

if (collisions.length) {
  console.error('Tracked-path case collision(s) detected:');
  for (const [left, right] of collisions) console.error(`- ${left} <-> ${right}`);
  process.exit(1);
}

console.log(`Tracked-path case check passed (${trackedPaths.length} files)`);
